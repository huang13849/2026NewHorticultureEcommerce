/**
 * lib/pgOrders.js — B2C 订单持久层 (PostgreSQL plant_collector schema)
 *
 * 读写分离:
 *   写: PG_WRITE_HOST (默认 RPi8 primary 100.67.126.90:5432)
 *   读: PG_READ_HOST  (默认 xsyysj replica 100.127.141.83:5433, 逗号分隔支持多副本 round-robin)
 *
 * 表: plant_collector.orders + plant_collector.order_items + plant_collector.outbox
 * 事务写: 创建订单时 INSERT orders + INSERT order_items + INSERT outbox (原子)
 */
const { Pool } = require('pg');

const PG_USER = process.env.PG_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || '';
const PG_DATABASE = process.env.PG_DATABASE || 'supply_chain';

// 写主库 —— 单一 primary
const writeHost = (process.env.PG_WRITE_HOST || process.env.PG_HOST || '100.67.126.90');
const writePort = parseInt(process.env.PG_WRITE_PORT || process.env.PG_PORT || '5432', 10);
const writePool = new Pool({
  host: writeHost,
  port: writePort,
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
});
writePool.on('error', err => console.error('[pgOrders] write pool err', err.message));

// 读副本池 —— 支持多副本
const readList = (process.env.PG_READ_HOSTS || process.env.PG_READ_HOST || '100.127.141.83:5433')
  .split(',').map(s => s.trim()).filter(Boolean);
const readPools = readList.map(hp => {
  const [h, p] = hp.split(':');
  const pool = new Pool({
    host: h,
    port: parseInt(p || '5432', 10),
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD,
    max: 5,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', err => console.error(`[pgOrders] read pool ${hp} err`, err.message));
  return { pool, hp };
});
let readRR = 0;
function pickReadPool() {
  if (readPools.length === 0) return writePool;
  const { pool } = readPools[readRR++ % readPools.length];
  return pool;
}

console.log(`[pgOrders] write=${writeHost}:${writePort}, read=${readList.join(',')}`);

// ===== 内部: 生成 order_no =====
function genOrderNo() {
  return 'PAY' + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ===== 创建订单 (事务: orders + items + outbox) =====
async function createOrder({
  zid, orderNo, subtotal = 0, shippingFee = 0, discount = 0, total = 0,
  currency = 'CNY', shippingAddress = null, couponCode = null,
  source = 'checkout', originSite = null, metadata = null,
  items = [], status = 'pending',
}) {
  if (!zid) throw new Error('zid required');
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const oNo = orderNo || genOrderNo();
    const insOrder = await client.query(
      `INSERT INTO plant_collector.orders
       (order_no, zid, status, subtotal, shipping_fee, discount, total,
        currency, shipping_address, coupon_code, source, origin_site, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [oNo, zid, status, subtotal, shippingFee, discount, total,
       currency, shippingAddress ? JSON.stringify(shippingAddress) : null,
       couponCode, source, originSite, metadata ? JSON.stringify(metadata) : null]
    );
    const order = insOrder.rows[0];

    const insertedItems = [];
    for (const it of items) {
      const insItem = await client.query(
        `INSERT INTO plant_collector.order_items
         (order_id, sku_id, title, qty, unit_price, subtotal, snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          order.id,
          String(it.sku_id || it.skuId || it.id || it.productId || ''),
          it.title || it.name || '',
          parseInt(it.qty || it.quantity || 1, 10),
          Number(it.unit_price || it.unitPrice || it.price || 0),
          Number(it.subtotal || (Number(it.unit_price || it.unitPrice || it.price || 0) * parseInt(it.qty || it.quantity || 1, 10))),
          JSON.stringify(it),
        ]
      );
      insertedItems.push(insItem.rows[0]);
    }

    // outbox event: order.created
    await client.query(
      `INSERT INTO plant_collector.outbox
       (aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1,$2,$3,$4)`,
      ['order', String(order.id), 'order.created', JSON.stringify({
        order_id: order.id, order_no: order.order_no, zid: order.zid,
        total: Number(order.total), items: insertedItems.length,
      })]
    );

    await client.query('COMMIT');
    return { ...order, items: insertedItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ===== 更新订单状态 (paid/shipped/delivered/cancelled) =====
async function updateOrderStatus(orderNoOrId, patch = {}) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const key = /^\d+$/.test(String(orderNoOrId)) ? 'id' : 'order_no';
    const sets = ['updated_at = now()'];
    const vals = [];
    let i = 1;
    if (patch.status) { sets.push(`status = $${i++}`); vals.push(patch.status); }
    if (patch.paidAt !== undefined) { sets.push(`paid_at = $${i++}`); vals.push(patch.paidAt); }
    if (patch.shippedAt !== undefined) { sets.push(`shipped_at = $${i++}`); vals.push(patch.shippedAt); }
    if (patch.deliveredAt !== undefined) { sets.push(`delivered_at = $${i++}`); vals.push(patch.deliveredAt); }
    if (patch.cancelledAt !== undefined) { sets.push(`cancelled_at = $${i++}`); vals.push(patch.cancelledAt); }
    if (patch.metadata) { sets.push(`metadata = metadata || $${i++}::jsonb`); vals.push(JSON.stringify(patch.metadata)); }
    vals.push(orderNoOrId);
    const q = `UPDATE plant_collector.orders SET ${sets.join(', ')} WHERE ${key} = $${i} RETURNING *`;
    const r = await client.query(q, vals);
    if (!r.rows[0]) { await client.query('ROLLBACK'); return null; }
    const order = r.rows[0];
    // outbox event
    if (patch.status) {
      await client.query(
        `INSERT INTO plant_collector.outbox
         (aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1,$2,$3,$4)`,
        ['order', String(order.id), `order.${patch.status}`, JSON.stringify({
          order_id: order.id, order_no: order.order_no, zid: order.zid, status: patch.status,
        })]
      );
    }
    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ===== 读: 按用户 zid 查列表 (走 read replica) =====
async function listByUser(zid, { limit = 200, offset = 0 } = {}) {
  if (!zid) return [];
  const pool = pickReadPool();
  const r = await pool.query(
    `SELECT o.*, COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM plant_collector.orders o
     LEFT JOIN plant_collector.order_items oi ON oi.order_id = o.id
     WHERE o.zid = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [zid, limit, offset]
  );
  return r.rows;
}

// ===== 读: 按 order_no 查单个 =====
async function findByOrderNo(orderNo) {
  if (!orderNo) return null;
  const pool = pickReadPool();
  const r = await pool.query(
    `SELECT o.*, COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM plant_collector.orders o
     LEFT JOIN plant_collector.order_items oi ON oi.order_id = o.id
     WHERE o.order_no = $1
     GROUP BY o.id`,
    [orderNo]
  );
  return r.rows[0] || null;
}

// ===== 读: 按 metadata (e.g. stripe_session_id) 查 =====
async function findByStripeSession(sessionId) {
  if (!sessionId) return null;
  const pool = pickReadPool();
  const r = await pool.query(
    `SELECT o.*, COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM plant_collector.orders o
     LEFT JOIN plant_collector.order_items oi ON oi.order_id = o.id
     WHERE o.metadata->>'stripe_session_id' = $1
     GROUP BY o.id`,
    [sessionId]
  );
  return r.rows[0] || null;
}

// ===== 健康检查 =====
async function healthCheck() {
  const out = { write: 'unknown', reads: [] };
  try {
    const r = await writePool.query('SELECT pg_is_in_recovery() AS ro, now() AS now');
    out.write = r.rows[0].ro ? 'ERROR-primary-in-recovery' : 'OK';
    out.writeHost = `${writeHost}:${writePort}`;
  } catch (e) { out.write = 'ERR ' + e.message; }
  for (const { pool, hp } of readPools) {
    try {
      const r = await pool.query('SELECT pg_is_in_recovery() AS ro');
      out.reads.push({ host: hp, status: r.rows[0].ro ? 'OK-replica' : 'WARN-not-replica' });
    } catch (e) { out.reads.push({ host: hp, status: 'ERR ' + e.message }); }
  }
  return out;
}

module.exports = {
  createOrder,
  updateOrderStatus,
  listByUser,
  findByOrderNo,
  findByStripeSession,
  healthCheck,
  genOrderNo,
  _pools: { writePool, readPools }, // for tests
};
