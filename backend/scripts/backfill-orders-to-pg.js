
/**
 * Backfill Mongo `orders` -> PG plant_collector.orders (+ order_items)
 * Idempotent: ON CONFLICT (order_no) DO NOTHING.
 * Run inside k8s pod that has PG_HOST/PG_PASSWORD env, or set them explicitly.
 */
const axios = require('axios');
const { Pool } = require('pg');

const GATEWAY = process.env.API_GATEWAY_URL || 'http://100.96.54.109:31007';
const API_KEY = process.env.API_KEY || 'flower-secure-api-key-2024';
const client = axios.create({ timeout: 30000, headers: { 'X-API-Key': API_KEY } });

const pgPool = new Pool({
  host: process.env.PG_HOST || '100.67.126.90',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'supply_chain',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  max: 5,
});

function pickZid(o) {
  if (o.zid) return String(o.zid);
  if (o.openid) return 'wechat:' + o.openid;
  if (o.type === 'auction') return 'auction:' + (o.bidderPhone || o.bidderName || 'guest');
  if (o.phone) return 'legacy:' + String(o.phone);
  return 'legacy:unknown';
}
function pickSource(o) {
  if (o.type === 'auction') return 'auction';
  if (o.openid || o.payMethod === 'wechat' || String(o.orderId||'').startsWith('WX')) return 'wechat-pay';
  return 'checkout';
}
function pickStatus(o) {
  if (o.status === 'paid') return 'paid';
  if (o.status === 'mock_paid') return 'mock_paid';
  if (o.status === 'cancelled') return 'cancelled';
  if (o.status === 'shipped') return 'shipped';
  if (o.status === 'delivered') return 'delivered';
  return 'pending';
}

async function fetchAll() {
  const out = [];
  let page = 1, batch = 500;
  while (true) {
    const url = `${GATEWAY}/api/mongo/orders?filter=${encodeURIComponent('{}')}&limit=${batch}&page=${page}&sort=${encodeURIComponent('{"createdAt":1}')}`;
    const resp = await client.get(url);
    const list = Array.isArray(resp.data) ? resp.data : (resp.data.data || resp.data.results || []);
    if (!list.length) break;
    out.push(...list);
    if (list.length < batch) break;
    page += 1;
  }
  return out;
}

async function upsert(o) {
  const orderNo = o.orderId || o.order_no;
  if (!orderNo) return { skipped: true, reason: 'no orderId' };
  const zid = pickZid(o);
  const status = pickStatus(o);
  const source = pickSource(o);
  const subtotal = Number(o.subtotal || 0);
  const shippingFee = Number(o.shippingFee || 0);
  const discount = Number(o.couponDiscount || 0);
  const total = Number(o.totalAmount || o.total || (subtotal + shippingFee - discount));
  const currency = o.currency || (source === 'checkout' ? 'CNY' : 'CNY');
  const shipping = (o.deliveryAddress || o.memberName || o.phone || o.address)
    ? { text: o.deliveryAddress || (o.address && o.address.text) || '', memberName: o.memberName || (o.address && o.address.name) || '', phone: o.phone || (o.address && o.address.phone) || '' }
    : null;
  const metadata = {
    pay_method: o.payMethod || '',
    provider: o.provider || '',
    brand: o.brand || '',
    region: o.region || '',
    stripe_session_id: o.stripeSessionId || null,
    checkout_url: o.checkoutUrl || '',
    openid: o.openid || '',
    transaction_id: o.transactionId || '',
    coupon_title: o.couponTitle || '',
    auction_id: o.auctionId ? String(o.auctionId) : '',
    product_id: o.productId ? String(o.productId) : '',
    product_title: o.productTitle || '',
    bidder_name: o.bidderName || '',
    bidder_phone: o.bidderPhone || '',
    type: o.type || '',
    _legacy_mongo_id: o._id ? String(o._id) : '',
  };
  const createdAt = o.createdAt ? new Date(o.createdAt) : null;
  const paidAt = o.paidAt ? new Date(o.paidAt) : null;

  const client_ = await pgPool.connect();
  try {
    await client_.query('BEGIN');
    const ins = await client_.query(
      `INSERT INTO plant_collector.orders
        (order_no, zid, status, subtotal, shipping_fee, discount, total, currency,
         shipping_address, source, origin_site, metadata, created_at, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13, now()), $14)
       ON CONFLICT (order_no) DO NOTHING
       RETURNING id`,
      [orderNo, zid, status, subtotal, shippingFee, discount, total, currency,
       shipping ? JSON.stringify(shipping) : null, source, o.region || null,
       JSON.stringify(metadata), createdAt, paidAt]
    );
    if (!ins.rows[0]) { await client_.query('ROLLBACK'); return { skipped: true, reason: 'exists' }; }
    const orderPgId = ins.rows[0].id;
    for (const it of (o.items || [])) {
      await client_.query(
        `INSERT INTO plant_collector.order_items
          (order_id, sku_id, title, qty, unit_price, subtotal, snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          orderPgId,
          String(it.productId || it.id || ''),
          it.name || it.title || '',
          parseInt(it.quantity || it.qty || 1, 10),
          Number(it.price || it.unitPrice || 0),
          Number(it.subtotal || (Number(it.price || 0) * Number(it.quantity || 1))),
          JSON.stringify(it),
        ]
      );
    }
    await client_.query('COMMIT');
    return { inserted: true, id: orderPgId };
  } catch (e) {
    await client_.query('ROLLBACK');
    return { error: e.message };
  } finally {
    client_.release();
  }
}

(async () => {
  console.log('[backfill] fetching Mongo orders...');
  const all = await fetchAll();
  console.log('[backfill] mongo orders total:', all.length);
  let ins=0, skip=0, err=0;
  for (const o of all) {
    const r = await upsert(o);
    if (r.inserted) ins++;
    else if (r.skipped) skip++;
    else if (r.error) { err++; console.error('[backfill] err', o.orderId, r.error); }
  }
  console.log(JSON.stringify({ mongo_total: all.length, inserted: ins, skipped: skip, errors: err }));
  await pgPool.end();
})().catch(e => { console.error(e); process.exit(1); });
