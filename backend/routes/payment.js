/**
 * 聚合支付路由
 * 前台放弃微信支付入口，统一走 Stripe / PayPal；支付宝作为可配置候选项。
 * 订单数据存 MongoDB (通过 API Gateway)。
 *
 * 真实收银台接入方式：
 *  - Stripe: 配置 STRIPE_CHECKOUT_URL 或后续接入 Stripe Checkout Session
 *  - PayPal: 配置 PAYPAL_CHECKOUT_URL 或后续接入 PayPal Orders API
 *  - Alipay: 配置 ALIPAY_CHECKOUT_URL + ALIPAY_ENABLED=true（资质/备案确认后再启用）
 */
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const pgOrders = require('../lib/pgOrders');
const loginService = require('../services/login-service');

const axios = require('axios');
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://100.96.54.109:3008';
const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

const COUPONS = {
  NEWUSER10: { code: 'NEWUSER10', title: '新人立减10元', type: 'amount', value: 10, minSubtotal: 30 },
  FLOWER8: { code: 'FLOWER8', title: '花友专享 8 折', type: 'percent', value: 20, minSubtotal: 50, maxDiscount: 30 },
  FREESHIP: { code: 'FREESHIP', title: '免运费券', type: 'shipping', value: 999, minSubtotal: 20 },
};

function roundMoney(n) { return Math.round(Number(n || 0) * 100) / 100; }
function estimateShipping(subtotal, items) {
  if (subtotal >= 199) return 0;
  const qty = items.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
  return roundMoney(8 + Math.max(0, qty - 1) * 2);
}
function applyCoupon(subtotal, shippingFee, couponCode) {
  const code = String(couponCode || '').trim().toUpperCase();
  if (!code) return { couponCode: '', couponTitle: '', couponDiscount: 0, couponMessage: '' };
  const coupon = COUPONS[code];
  if (!coupon) return { couponCode: code, couponTitle: '', couponDiscount: 0, couponMessage: '优惠券不存在' };
  if (subtotal < coupon.minSubtotal) return { couponCode: code, couponTitle: coupon.title, couponDiscount: 0, couponMessage: `满 ¥${coupon.minSubtotal} 可用` };
  let discount = 0;
  if (coupon.type === 'amount') discount = coupon.value;
  if (coupon.type === 'percent') discount = subtotal * coupon.value / 100;
  if (coupon.type === 'shipping') discount = shippingFee;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(roundMoney(discount), roundMoney(subtotal + shippingFee));
  return { couponCode: code, couponTitle: coupon.title, couponDiscount: discount, couponMessage: discount > 0 ? '已优惠' : '' };
}
async function enrichItems(items) {
  const normalized = normalizeItems(items).orderItems;
  const enriched = [];
  for (const item of normalized) {
    let costPrice = 0;
    let shippingDescription = '';
    try {
      if (item.productId && !String(item.productId).startsWith('test-')) {
        const product = await db.findById('products', item.productId);
        if (product) {
          costPrice = Number(product.costPrice || product.settlementPrice || 0);
          shippingDescription = product.shipping_description || '';
        }
      }
    } catch (_) {}
    enriched.push({ ...item, costPrice: roundMoney(costPrice), lineCost: roundMoney(costPrice * item.quantity), shippingDescription });
  }
  return enriched;
}
function buildQuote(items, couponCode = '') {
  const subtotal = roundMoney(items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1), 0));
  const shippingFee = estimateShipping(subtotal, items);
  const coupon = applyCoupon(subtotal, shippingFee, couponCode);
  const totalAmount = Math.max(0.01, roundMoney(subtotal + shippingFee - coupon.couponDiscount));
  const costAmount = roundMoney(items.reduce((sum, i) => sum + Number(i.lineCost || 0), 0));
  const profitAmount = roundMoney(totalAmount - costAmount);
  return { subtotal, shippingFee, ...coupon, totalAmount, costAmount, profitAmount };
}
async function syncPurchaseOrder(order) {
  if (order.syncedPurchaseOrderId) return order.syncedPurchaseOrderId;
  const payload = {
    member_id: order.memberId || '',
    member_name: order.memberName || '花伴用户',
    phone: order.phone || '',
    business_type: '团购/电商',
    purchase_time: order.paidAt || new Date().toISOString(),
    delivery_address: order.deliveryAddress || '',
    product_id: order.items.map(i => i.productId).filter(Boolean),
    product_title: order.items.map(i => `${i.name} ×${i.quantity}`),
    personal_tag: '花伴商城,Stripe',
    payment_order_id: order.orderId,
    payment_channel: order.provider || order.payMethod,
    region: order.region || (['wechat','alipay'].includes(order.payMethod) ? 'cn' : 'global'),
    product_subtotal: order.subtotal,
    shipping_fee: order.shippingFee,
    coupon_code: order.couponCode || '',
    coupon_discount: order.couponDiscount || 0,
    income_amount: order.totalAmount,
    cost_amount: order.costAmount || 0,
    expense_amount: order.costAmount || 0,
    profit_amount: order.profitAmount != null ? order.profitAmount : roundMoney(Number(order.totalAmount || 0) - Number(order.costAmount || 0)),
  };
  const res = await axios.post(`${ORDER_SERVICE_URL}/api/orders`, payload, { timeout: 15000 });
  const id = res.data?.data?.id || res.data?.id || null;
  if (id && order._id) await db.update('orders', order._id, { syncedPurchaseOrderId: id, syncedAt: new Date().toISOString() });
  return id;
}


const SITE_URL = process.env.SITE_URL || 'http://100.76.15.64:3000';
const REGION = process.env.REGION || 'global';

const PROVIDERS = {
  stripe: {
    name: 'Stripe',
    configured: !!(stripeConfigured || process.env.STRIPE_CHECKOUT_URL || process.env.STRIPE_PAYMENT_LINK_URL),
    checkoutUrl: process.env.STRIPE_CHECKOUT_URL || process.env.STRIPE_PAYMENT_LINK_URL || '',
    note: 'Supports cards / Apple Pay / Google Pay when configured.',
  },
  paypal: {
    name: 'PayPal',
    configured: !!(process.env.PAYPAL_CHECKOUT_URL || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)),
    checkoutUrl: process.env.PAYPAL_CHECKOUT_URL || '',
    note: 'Supports PayPal balance and international card payments when configured.',
  },
  alipay: {
    name: 'Alipay',
    configured: process.env.ALIPAY_ENABLED === 'true' && !!process.env.ALIPAY_CHECKOUT_URL,
    checkoutUrl: process.env.ALIPAY_CHECKOUT_URL || '',
    note: 'Disabled by default. Domestic website/app acquiring usually requires business qualification and may require ICP filing.',
  },
};

// 兜底测试商品
const FALLBACK_PRODUCTS = [
  { id: 'test-flower-001', name: '测试花卉A', price: 0.01, image: '🌸', description: '0.01元测试商品 — 春日樱花苗' },
  { id: 'test-flower-002', name: '测试花卉B', price: 0.01, image: '🌺', description: '0.01元测试商品 — 夏日木槿苗' },
];

function appendCheckoutParams(baseUrl, order) {
  if (!baseUrl) return '';
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('orderId', order.orderId);
    url.searchParams.set('amount', String(order.totalAmount));
    url.searchParams.set('currency', order.currency || 'CNY');
    url.searchParams.set('success_url', `${SITE_URL}/payment?status=success&orderId=${order.orderId}`);
    url.searchParams.set('cancel_url', `${SITE_URL}/payment?status=cancel&orderId=${order.orderId}`);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function normalizeItems(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('购物车不能为空');
  }

  let totalAmount = 0;
  const orderItems = items.map(item => {
    const qty = Math.max(1, Number(item.quantity || 1));
    const price = Math.max(0, Number(item.price || 0));
    totalAmount += price * qty;
    return {
      productId: item.productId || item.id,
      name: item.name || '花卉商品',
      price,
      quantity: qty,
      image: item.image || '',
    };
  }).filter(item => item.price > 0);

  if (orderItems.length === 0 || totalAmount <= 0) {
    throw new Error('订单金额必须大于0');
  }

  return { orderItems, totalAmount: Math.round(totalAmount * 100) / 100 };
}

router.get('/config-status', (req, res) => {
  res.json(PROVIDERS);
});


router.get('/coupons', (req, res) => {
  res.json({ coupons: Object.values(COUPONS) });
});

router.post('/quote', async (req, res) => {
  try {
    const items = await enrichItems(req.body.items || []);
    const quote = buildQuote(items, req.body.couponCode || '');
    res.json({ items, ...quote, currency: 'CNY' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/confirm-stripe', async (req, res) => {
  try {
    const { sessionId, orderId } = req.body;
    let pgOrder = null;
    if (sessionId) pgOrder = await pgOrders.findByStripeSession(sessionId);
    if (!pgOrder && orderId) pgOrder = await pgOrders.findByOrderNo(orderId);
    if (!pgOrder) return res.status(404).json({ error: '订单不存在' });
    let paid = (pgOrder.status === 'paid' || pgOrder.status === 'mock_paid');
    if (stripeConfigured && sessionId) {
      const sessionRes = await axios.get(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        auth: { username: process.env.STRIPE_SECRET_KEY, password: '' },
        timeout: 15000,
      });
      paid = sessionRes.data.payment_status === 'paid';
    }
    if (!paid) return res.status(400).json({ error: '支付尚未完成', order: pgOrder });
    const paidAt = pgOrder.paid_at || new Date().toISOString();
    if (pgOrder.status !== 'paid') {
      await pgOrders.updateOrderStatus(pgOrder.order_no, { status: 'paid', paidAt });
    }
    const purchaseOrderId = await syncPurchaseOrder({
      orderId: pgOrder.order_no,
      _id: pgOrder.id,
      items: pgOrder.items,
      totalAmount: Number(pgOrder.total),
      subtotal: Number(pgOrder.subtotal),
      shippingFee: Number(pgOrder.shipping_fee),
      memberName: (pgOrder.shipping_address || {}).memberName || '',
      phone: (pgOrder.shipping_address || {}).phone || '',
      deliveryAddress: (pgOrder.shipping_address || {}).text || '',
      zid: pgOrder.zid,
      status: 'paid', paidAt,
    });
    res.json({ ok: true, order: { ...pgOrder, status: 'paid', paidAt, syncedPurchaseOrderId: purchaseOrderId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await db.find('products', { limit: 50 });
    const payProducts = (products || []).map(p => ({
      id: p._id,
      name: p.title || p.flowerName || '花卉商品',
      price: Number(p.sellPrice || p.price || p.settlementPrice || 0),
      image: (p.panorama_images || p.detail_images || p.images || [])[0] || '',
      description: p.description || p.spec || '',
    })).filter(p => p.price > 0);
    res.json({ products: payProducts.length ? payProducts : FALLBACK_PRODUCTS });
  } catch (err) {
    res.json({ products: FALLBACK_PRODUCTS, warning: err.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    let currentZid = '';
    let currentBrand = '';
    try {
      const sess = await loginService.readSession(req);
      if (sess && sess.user && sess.user.zid) { currentZid = sess.user.zid; currentBrand = sess.user.brand || ''; }
    } catch (_) {}
    const { items, payMethod = 'stripe', couponCode = '', customer = {}, deliveryAddress = '' } = req.body;
    if (!String(deliveryAddress || '').trim()) return res.status(400).json({ error: '请先填写收货地址' });
    const provider = PROVIDERS[payMethod];
    if (!provider) return res.status(400).json({ error: '不支持的支付方式' });

    // Alipay: always allow (mock if not configured)
    const orderItems = await enrichItems(items);
    const quote = buildQuote(orderItems, couponCode);
    const orderId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    let checkoutUrl = '';
    let stripeSessionId = '';
    const order = {
      orderId,
      items: orderItems,
      subtotal: quote.subtotal,
      shippingFee: quote.shippingFee,
      couponCode: quote.couponCode,
      couponTitle: quote.couponTitle,
      couponDiscount: quote.couponDiscount,
      totalAmount: quote.totalAmount,
      costAmount: quote.costAmount,
      profitAmount: quote.profitAmount,
      currency: 'CNY',
      payMethod,
      provider: provider.name,
      status: provider.configured ? 'pending' : 'mock_paid',
      memberName: customer.name || '',
      phone: customer.phone || '',
      deliveryAddress,
      zid: currentZid,
      brand: currentBrand,
      region: ['wechat','alipay'].includes(payMethod) ? 'cn' : 'global',
      createdAt: new Date().toISOString(),
      paidAt: provider.configured ? null : new Date().toISOString(),
      checkoutUrl: '',
      stripeSessionId: '',
    };

    if (payMethod === 'stripe' && stripeConfigured) {
      const form = new URLSearchParams();
      form.set('mode', 'payment');
      form.append('payment_method_types[]', 'card');
      form.set('success_url', `${SITE_URL}/payment?status=success&session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`);
      form.set('cancel_url', `${SITE_URL}/payment?status=cancel&orderId=${orderId}`);
      form.set('metadata[orderId]', orderId);
      if (quote.couponCode) form.set('metadata[couponCode]', quote.couponCode);
      // Stripe Checkout charges the final payable amount as one order line so coupon/shipping math matches our quote exactly.
      form.set('line_items[0][quantity]', '1');
      form.set('line_items[0][price_data][currency]', 'cny');
      form.set('line_items[0][price_data][product_data][name]', `花伴商城订单 ${orderId}`);
      form.set('line_items[0][price_data][product_data][description]', `商品小计 ¥${quote.subtotal} + 运费 ¥${quote.shippingFee} - 优惠 ¥${quote.couponDiscount}`);
      form.set('line_items[0][price_data][unit_amount]', String(Math.max(1, Math.round(quote.totalAmount * 100))));
      const sessionRes = await axios.post('https://api.stripe.com/v1/checkout/sessions', form, {
        auth: { username: process.env.STRIPE_SECRET_KEY, password: '' },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      });
      checkoutUrl = sessionRes.data.url;
      stripeSessionId = sessionRes.data.id;
      order.checkoutUrl = checkoutUrl;
      order.stripeSessionId = stripeSessionId;
    } else if (provider.configured && provider.checkoutUrl) {
      order.checkoutUrl = appendCheckoutParams(provider.checkoutUrl, order);
      checkoutUrl = order.checkoutUrl;
    }

    // === PG: canonical write to plant_collector.orders ===
    let pgSaved = null;
    try {
      pgSaved = await pgOrders.createOrder({
        zid: currentZid,
        orderNo: orderId,
        subtotal: quote.subtotal,
        shippingFee: quote.shippingFee,
        discount: quote.couponDiscount,
        total: quote.totalAmount,
        currency: 'CNY',
        shippingAddress: (deliveryAddress || customer) ? { text: deliveryAddress, memberName: customer.name || '', phone: customer.phone || '' } : null,
        couponCode: quote.couponCode || null,
        source: 'checkout',
        originSite: req.get('host') || null,
        metadata: {
          pay_method: payMethod,
          provider: provider.name,
          brand: currentBrand,
          region: order.region,
          checkout_url: checkoutUrl,
          stripe_session_id: stripeSessionId || null,
          cost_amount: quote.costAmount,
          profit_amount: quote.profitAmount,
          coupon_title: quote.couponTitle || null,
        },
        items: orderItems.map(it => ({
          sku_id: it.productId || it.id || '',
          title: it.name || it.title || '',
          qty: it.quantity || 1,
          unit_price: Number(it.price || 0),
          subtotal: Number(it.price || 0) * Number(it.quantity || 1),
          snapshot: it,
        })),
        status: provider.configured ? 'pending' : 'mock_paid',
      });
      order._pgId = pgSaved.id;
    } catch (e) {
      console.error('[checkout] PG createOrder failed:', e.message);
      return res.status(500).json({ error: 'pg_write_failed', detail: e.message });
    }
    // No Mongo mirror — PostgreSQL is the source of truth.
    if (!provider.configured) {
      try { await syncPurchaseOrder({ ...order, _id: pgSaved.id }); } catch (e) { console.error('sync mock order failed:', e.message); }
    }

    res.json({
      orderId,
      stripeSessionId,
      ...quote,
      payMethod,
      provider: provider.name,
      status: order.status,
      checkoutUrl,
      mock: !provider.configured,
      message: provider.configured ? '支付订单已创建' : `${provider.name} 尚未配置真实收银台，当前为模拟支付成功。`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 兼容旧前端/测试脚本：创建订单但不强制跳转
router.post('/order', async (req, res) => {
  req.body.payMethod = req.body.payMethod || 'stripe';
  return router.handle({ ...req, url: '/checkout', method: 'POST' }, res, () => {});
});

router.post('/pay/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.findOne('orders', { orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status === 'paid' || order.status === 'mock_paid') return res.json({ message: '订单已支付', order });

    const updated = await db.update('orders', order._id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    res.json({ message: '支付成功', order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await pgOrders.findByOrderNo(req.params.orderId);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    // 必须登录: 只返回该用户 (zid) 的订单
    let zid = '';
    try {
      const sess = await loginService.readSession(req);
      if (sess && sess.user && sess.user.zid) zid = sess.user.zid;
    } catch (_) {}
    if (!zid) return res.status(401).json({ error: 'unauthenticated', orders: [], total: 0 });
    const rows = await pgOrders.listByUser(zid, { limit: 200 });
    const orders = rows.map(r => {
      const meta = r.metadata || {};
      const addr = r.shipping_address || {};
      return {
        _id: r.id,
        orderId: r.order_no,
        zid: r.zid,
        status: r.status,
        subtotal: Number(r.subtotal),
        shippingFee: Number(r.shipping_fee),
        couponDiscount: Number(r.discount),
        totalAmount: Number(r.total),
        currency: r.currency,
        payMethod: meta.pay_method || '',
        provider: meta.provider || '',
        brand: meta.brand || '',
        region: meta.region || (req.query.region || ''),
        stripeSessionId: meta.stripe_session_id || '',
        checkoutUrl: meta.checkout_url || '',
        memberName: addr.memberName || '',
        phone: addr.phone || '',
        deliveryAddress: addr.text || '',
        items: (r.items || []).map(it => ({
          productId: it.sku_id, name: it.title, price: Number(it.unit_price),
          quantity: it.qty, ...(it.snapshot || {}),
        })),
        createdAt: r.created_at,
        paidAt: r.paid_at,
      };
    });
    const filtered = req.query.region ? orders.filter(o => o.region === req.query.region) : orders;
    res.json({ orders: filtered, total: filtered.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
