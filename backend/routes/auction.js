/**
 * 拍卖路由
 * - 读取 MongoDB 乔灌木分类商品用于拍卖
 * - 竞价每次+5元，10分钟倒计时
 * - 每天上午9点标识
 * - 拍卖成功→购物车→支付→订单
 */
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

const BID_INCREMENT = 5;        // 每次加价5元
const AUCTION_DURATION = 600;   // 10分钟 = 600秒

// ===== 获取拍卖商品列表 =====
router.get('/items', async (req, res) => {
  try {
    // 先查乔灌木分类，不够再用有价格的商品补充
    let items = await db.find('products', {
      filter: { category: '乔灌木', sellPrice: { $gt: 0 } },
      sort: { sellPrice: -1 },
    });

    // 如果乔灌木不足，补充其他有价格的商品
    if (items.length < 6) {
      const existingIds = items.map(i => i._id);
      const others = await db.find('products', {
        filter: {
          sellPrice: { $gt: 0 },
          _id: { $nin: existingIds },
        },
        sort: { sellPrice: -1 },
        limit: 6 - items.length,
      });
      items = [...items, ...others];
    }

    // 获取每个商品的拍卖状态
    const auctionItems = await Promise.all(items.map(async (product) => {
      const auction = await db.findOne('auctions', {
        productId: product._id,
        status: { $in: ['active', 'pending'] },
      });

      const now = new Date();
      const today9am = new Date(now);
      today9am.setHours(9, 0, 0, 0);

      let status = 'upcoming';
      let currentPrice = product.sellPrice || product.settlementPrice || 0;
      let currentBidder = null;
      let endTime = null;
      let remainingSeconds = 0;
      let bidCount = 0;

      if (auction) {
        status = auction.status;
        currentPrice = auction.currentPrice;
        currentBidder = auction.currentBidder;
        endTime = auction.endTime;
        bidCount = auction.bidCount || 0;

        if (auction.status === 'active' && auction.endTime) {
          const end = new Date(auction.endTime);
          remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
          if (remainingSeconds <= 0) {
            status = 'ended';
          }
        }
      }

      // 是否今天上午9点开始
      const isToday9am = now >= today9am && now < new Date(today9am.getTime() + 3600000);

      // 图片URL处理
      let imageUrl = '';
      if (product.images && product.images.length > 0) {
        imageUrl = product.images[0];
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `http://100.96.54.109:9000/supply-chain/${imageUrl}`;
        }
      }

      return {
        productId: product._id,
        title: product.title || product.flowerName || '未命名',
        category: product.category,
        flowerName: product.flowerName,
        basePrice: product.settlementPrice || product.sellPrice || 0,
        currentPrice,
        currentBidder,
        bidCount,
        status,
        imageUrl,
        origin: product.origin || '',
        specSize: product.specSize || '',
        stock: product.stock || 0,
        startTime: today9am.toISOString(),
        endTime: endTime,
        remainingSeconds,
        isToday9am,
        bidIncrement: BID_INCREMENT,
      };
    }));

    res.json({ items: auctionItems, total: auctionItems.length });
  } catch (err) {
    console.error('Auction items error:', err);
    res.status(500).json({ error: '获取拍卖商品失败' });
  }
});

// ===== 开始拍卖 =====
router.post('/start/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await db.findById('products', productId);
    if (!product) return res.status(404).json({ error: '商品不存在' });

    // 检查是否已有活跃拍卖
    const existing = await db.findOne('auctions', {
      productId,
      status: { $in: ['active', 'pending'] },
    });
    if (existing) return res.status(400).json({ error: '该商品已有进行中的拍卖' });

    const now = new Date();
    const endTime = new Date(now.getTime() + AUCTION_DURATION * 1000);

    const auction = await db.create('auctions', {
      productId,
      title: product.title || product.flowerName,
      category: product.category,
      basePrice: product.settlementPrice || product.sellPrice || 0,
      currentPrice: product.sellPrice || product.settlementPrice || 0,
      currentBidder: null,
      bidCount: 0,
      bidHistory: [],
      status: 'active',
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: AUCTION_DURATION,
      createdAt: now.toISOString(),
    });

    res.json({
      auctionId: auction._id,
      productId,
      currentPrice: auction.currentPrice,
      endTime: auction.endTime,
      remainingSeconds: AUCTION_DURATION,
      status: 'active',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 竞价 =====
router.post('/bid/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { bidderName, bidderPhone } = req.body;

    if (!bidderName || !bidderPhone) {
      return res.status(400).json({ error: '请提供竞价人姓名和手机号' });
    }

    const auction = await db.findOne('auctions', {
      productId,
      status: 'active',
    });
    if (!auction) return res.status(404).json({ error: '没有进行中的拍卖' });

    // 检查倒计时
    const now = new Date();
    const end = new Date(auction.endTime);
    const remaining = Math.floor((end - now) / 1000);
    if (remaining <= 0) {
      await db.update('auctions', auction._id, { status: 'ended' });
      return res.status(400).json({ error: '拍卖已结束' });
    }

    // 不允许自己跟自己竞价
    if (auction.currentBidder && auction.currentBidder.phone === bidderPhone) {
      return res.status(400).json({ error: '您已是当前最高出价人' });
    }

    const newPrice = auction.currentPrice + BID_INCREMENT;
    const bidEntry = {
      price: newPrice,
      bidderName,
      bidderPhone,
      time: now.toISOString(),
    };

    await db.update('auctions', auction._id, {
      currentPrice: newPrice,
      currentBidder: { name: bidderName, phone: bidderPhone },
      bidCount: (auction.bidCount || 0) + 1,
      bidHistory: [...(auction.bidHistory || []), bidEntry],
    });

    res.json({
      productId,
      currentPrice: newPrice,
      currentBidder: { name: bidderName },
      bidCount: (auction.bidCount || 0) + 1,
      remainingSeconds: remaining,
      message: '竞价成功',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 获取拍卖状态 =====
router.get('/status/:productId', async (req, res) => {
  try {
    const auction = await db.findOne('auctions', {
      productId: req.params.productId,
      status: { $in: ['active', 'pending', 'ended'] },
    });
    if (!auction) return res.json({ status: 'none' });

    const now = new Date();
    const end = new Date(auction.endTime);
    const remaining = Math.max(0, Math.floor((end - now) / 1000));

    // 自动结束
    if (auction.status === 'active' && remaining <= 0) {
      await db.update('auctions', auction._id, { status: 'ended' });
      auction.status = 'ended';
    }

    res.json({
      auctionId: auction._id,
      productId: auction.productId,
      currentPrice: auction.currentPrice,
      currentBidder: auction.currentBidder,
      bidCount: auction.bidCount,
      status: auction.status,
      remainingSeconds: remaining,
      bidHistory: (auction.bidHistory || []).slice(-5),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 拍卖成交 → 创建订单 =====
router.post('/checkout/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { bidderName, bidderPhone, address } = req.body;

    const auction = await db.findOne('auctions', { productId, status: 'ended' });
    if (!auction) return res.status(404).json({ error: '拍卖未结束或不存在' });

    const winner = auction.currentBidder;
    if (!winner) return res.status(400).json({ error: '无人出价，无法成交' });

    const product = await db.findById('products', productId);

    const orderId = `AUC${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const order = {
      orderId,
      type: 'auction',
      productId,
      productTitle: auction.title,
      productCategory: auction.category,
      items: [{
        productId,
        name: auction.title,
        price: auction.currentPrice,
        quantity: 1,
        image: (product?.images?.[0]) || '',
      }],
      totalAmount: auction.currentPrice,
      payMethod: req.body.payMethod || 'wechat',
      status: 'pending',
      bidderName: bidderName || winner.name,
      bidderPhone: bidderPhone || winner.phone,
      address: address || {},
      auctionId: auction._id,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };

    await db.create('orders', order);
    // 标记拍卖已成交
    await db.update('auctions', auction._id, { status: 'sold' });

    res.json({
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      status: 'pending',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
