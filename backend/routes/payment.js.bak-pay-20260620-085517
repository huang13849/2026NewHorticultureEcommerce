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

const SITE_URL = process.env.SITE_URL || 'http://100.76.15.64:3000';

const PROVIDERS = {
  stripe: {
    name: 'Stripe',
    configured: !!(process.env.STRIPE_CHECKOUT_URL || process.env.STRIPE_PAYMENT_LINK_URL || process.env.STRIPE_SECRET_KEY),
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
    const { items, payMethod = 'stripe' } = req.body;
    const provider = PROVIDERS[payMethod];
    if (!provider) return res.status(400).json({ error: '不支持的支付方式' });

    if (payMethod === 'alipay' && !provider.configured) {
      return res.status(400).json({ error: '支付宝暂未开通：请先确认企业资质、网站/应用合规和备案要求。' });
    }

    const { orderItems, totalAmount } = normalizeItems(items);
    const orderId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const order = {
      orderId,
      items: orderItems,
      totalAmount,
      currency: 'CNY',
      payMethod,
      provider: provider.name,
      status: provider.configured ? 'pending' : 'mock_paid',
      createdAt: new Date().toISOString(),
      paidAt: provider.configured ? null : new Date().toISOString(),
      checkoutUrl: '',
    };

    if (provider.configured && provider.checkoutUrl) {
      order.checkoutUrl = appendCheckoutParams(provider.checkoutUrl, order);
    }

    await db.create('orders', order);

    res.json({
      orderId,
      totalAmount,
      payMethod,
      provider: provider.name,
      status: order.status,
      checkoutUrl: order.checkoutUrl,
      mock: !provider.configured,
      message: provider.configured
        ? '支付订单已创建'
        : `${provider.name} 尚未配置真实收银台，当前为模拟支付成功。`,
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
    const order = await db.findOne('orders', { orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await db.find('orders', { sort: JSON.stringify({ createdAt: -1 }) });
    res.json({ orders, total: orders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
