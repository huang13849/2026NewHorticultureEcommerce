const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== 手机号 + 验证码登录 =====
router.post('/login', async (req, res) => {
  try {
    const { phone, code, deviceInfo } = req.body;

    if (!phone) {
      return res.status(400).json({ error: '手机号必填' });
    }

    // 简化版：验证码 123456 直接通过（生产环境需对接短信服务）
    if (code && code !== '123456') {
      return res.status(400).json({ error: '验证码错误' });
    }

    let users = await db.find('users', { filter: { phone } });
    let user = users[0];

    if (!user) {
      const now = new Date();
      user = await db.create('users', {
        phone,
        nickname: `花友${phone.slice(-4)}`,
        avatar: '',
        location: { type: 'Point', coordinates: [0, 0] },
        locationAddress: '',
        address: [],
        deviceInfo: deviceInfo || {},
        preferences: { categories: [], priceRange: {}, favoriteSuppliers: [] },
        gardenStats: { totalPlanted: 0, totalCompleted: 0, totalGifted: 0 },
        lastLoginAt: now,
        createdAt: now,
      });
    }

    // 更新设备信息和最后登录
    const updateData = { lastLoginAt: new Date().toISOString() };
    if (deviceInfo) {
      updateData.deviceInfo = deviceInfo;
    }
    await db.update('users', user._id, updateData);

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        address: user.address,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// ===== 发送验证码（占位） =====
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: '手机号必填' });
  console.log(`📱 验证码已发送到 ${phone}: 123456`);
  res.json({ message: '验证码已发送', expiresIn: 300 });
});

// ===== 获取用户信息 =====
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: '未登录' });

    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = await db.findById('users', decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json({
      id: user._id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      address: user.address,
      location: user.location,
      gardenStats: user.gardenStats,
    });
  } catch (err) {
    res.status(401).json({ error: 'token 无效' });
  }
});

// ===== 更新用户位置 =====
router.put('/location', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: '未登录' });

    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { latitude, longitude, address } = req.body;

    const user = await db.findById('users', decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    await db.update('users', decoded.userId, {
      location: { type: 'Point', coordinates: [longitude, latitude] },
      locationAddress: address || '',
    });

    res.json({
      message: '位置已更新',
      location: { type: 'Point', coordinates: [longitude, latitude] },
    });
  } catch (err) {
    res.status(500).json({ error: '更新位置失败' });
  }
});

// ===== 更新收货地址 =====
router.put('/address', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: '未登录' });

    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { name, phone, province, city, district, detail, isDefault } = req.body;

    const user = await db.findById('users', decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const addresses = [...(user.address || [])];
    const newAddr = { name, phone, province, city, district, detail, isDefault: isDefault || false };

    if (isDefault) {
      addresses.forEach(a => a.isDefault = false);
    }

    const existIdx = addresses.findIndex(a =>
      a.detail === detail && a.province === province && a.city === city
    );

    if (existIdx >= 0) {
      addresses[existIdx] = newAddr;
    } else {
      if (addresses.length === 0) newAddr.isDefault = true;
      addresses.push(newAddr);
    }

    await db.update('users', decoded.userId, { address: addresses });
    res.json({ message: '地址已更新', address: addresses });
  } catch (err) {
    console.error('Address error:', err);
    res.status(500).json({ error: '更新地址失败' });
  }
});

module.exports = router;
