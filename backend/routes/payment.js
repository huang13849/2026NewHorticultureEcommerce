/**
 * 支付路由
 * 模拟微信/支付宝支付流程
 * 订单数据存 MongoDB (通过 API Gateway)
 */
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ===== 商品定义（0.01元测试商品） =====
const SHOP_PRODUCTS = [
  {
    id: 'test-flower-001',
    name: '测试花卉A',
    price: 0.01,
    image: '🌸',
    description: '0.01元测试商品 — 春日樱花苗',
  },
  {
    id: 'test-flower-002',
    name: '测试花卉B',
    price: 0.01,
    image: '🌺',
    description: '0.01元测试商品 — 夏日木槿苗',
  },
];

// ===== 获取商品列表 =====
router.get('/products', (req, res) => {
  res.json({ products: SHOP_PRODUCTS });
});

// ===== 创建订单 =====
router.post('/order', async (req, res) => {
  try {
    const { items, payMethod } = req.body; // items: [{productId, quantity}], payMethod: 'wechat'|'alipay'

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '购物车不能为空' });
    }

    // 计算总价
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const product = SHOP_PRODUCTS.find(p => p.id === item.productId);
      if (!product) throw new Error(`商品 ${item.productId} 不存在`);
      const qty = item.quantity || 1;
      totalAmount += product.price * qty;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
      };
    });

    // 生成订单号
    const orderId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const order = {
      orderId,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      payMethod: payMethod || 'wechat',
      status: 'pending',     // pending -> paid -> completed
      createdAt: new Date().toISOString(),
      paidAt: null,
      completedAt: null,
    };

    // 存入 MongoDB
    await db.create('orders', order);

    res.json({
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      payMethod: order.payMethod,
      status: order.status,
      // 模拟支付参数（真实场景返回微信/支付宝预支付信息）
      payUrl: `${order.payMethod === 'wechat' ? 'weixin' : 'alipay'}://pay?orderId=${order.orderId}&amount=${order.totalAmount}`,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.orderId)}`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== 模拟支付回调 =====
router.post('/pay/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // 查找订单
    const order = await db.findOne('orders', { orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status === 'paid') return res.json({ message: '订单已支付', order });
    if (order.status === 'completed') return res.json({ message: '订单已完成', order });

    // 更新为已支付
    const updated = await db.update('orders', order._id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    res.json({
      message: '支付成功',
      order: {
        orderId: updated.orderId || order.orderId,
        totalAmount: updated.totalAmount || order.totalAmount,
        payMethod: updated.payMethod || order.payMethod,
        status: 'paid',
        paidAt: updated.paidAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 查询订单状态 =====
router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await db.findOne('orders', { orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 查询用户所有订单 =====
router.get('/orders', async (req, res) => {
  try {
    const orders = await db.find('orders', {
      sort: JSON.stringify({ createdAt: -1 }),
    });
    res.json({ orders, total: orders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
