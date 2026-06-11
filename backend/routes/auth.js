const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        nickname: `花友${phone.slice(-4)}`,
        deviceInfo: deviceInfo || {},
      });
    }

    // 更新设备信息和最后登录
    if (deviceInfo) {
      user.deviceInfo = { ...user.deviceInfo, ...deviceInfo };
    }
    user.lastLoginAt = new Date();
    await user.save();

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
  // TODO: 对接短信服务
  console.log(`📱 验证码已发送到 ${phone}: 123456`);
  res.json({ message: '验证码已发送', expiresIn: 300 });
});

// ===== 获取用户信息 =====
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: '未登录' });

    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = await User.findById(decoded.userId);
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

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    user.location = { type: 'Point', coordinates: [longitude, latitude] };
    user.locationAddress = address || '';
    await user.save();

    res.json({ message: '位置已更新', location: user.location });
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

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newAddr = { name, phone, province, city, district, detail, isDefault: isDefault || false };
    
    if (isDefault) {
      user.address.forEach(a => a.isDefault = false);
    }
    
    const existIdx = user.address.findIndex(a => 
      a.detail === detail && a.province === province && a.city === city
    );
    
    if (existIdx >= 0) {
      user.address[existIdx] = newAddr;
    } else {
      if (user.address.length === 0) newAddr.isDefault = true;
      user.address.push(newAddr);
    }

    await user.save();
    res.json({ message: '地址已更新', address: user.address });
  } catch (err) {
    res.status(500).json({ error: '更新地址失败' });
  }
});

module.exports = router;
