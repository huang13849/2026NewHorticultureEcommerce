/**
 * 认证路由 — 支持验证码登录 + 超级管理员密码登录
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== 超级管理员配置 =====
const SUPER_ADMIN_PHONE = '18511987921';
const SUPER_ADMIN_PASSWORD_HASH = bcrypt.hashSync('Hy@11111111', 10);

// ===== 手机号 + 验证码/密码 登录 =====
router.post('/login', async (req, res) => {
  try {
    const { phone, code, password, deviceInfo } = req.body;

    if (!phone) {
      return res.status(400).json({ error: '手机号必填' });
    }

    let isAdmin = false;
    let isSuperAdmin = false;

    // 超级管理员密码登录
    if (phone === SUPER_ADMIN_PHONE && password) {
      if (!bcrypt.compareSync(password, SUPER_ADMIN_PASSWORD_HASH)) {
        return res.status(400).json({ error: '密码错误' });
      }
      isAdmin = true;
      isSuperAdmin = true;
    }
    // 验证码登录
    else if (code) {
      if (code !== '123456') {
        return res.status(400).json({ error: '验证码错误' });
      }
    }
    // 无密码无验证码
    else {
      return res.status(400).json({ error: '请输入验证码或密码' });
    }

    // 查找或创建用户
    let users = await db.find('users', { filter: { phone } });
    let user = users[0];

    if (!user) {
      const now = new Date();
      user = await db.create('users', {
        username: phone,
        phone,
        nickname: isSuperAdmin ? '超级管理员' : `花友${phone.slice(-4)}`,
        avatar: isSuperAdmin ? '👑' : '',
        role: isSuperAdmin ? 'super_admin' : 'user',
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

    // 更新角色和登录时间
    const updateData = { lastLoginAt: new Date().toISOString() };
    if (isSuperAdmin && user.role !== 'super_admin') {
      updateData.role = 'super_admin';
      updateData.nickname = '超级管理员';
      updateData.avatar = '👑';
    }
    if (deviceInfo) updateData.deviceInfo = deviceInfo;
    await db.update('users', user._id, updateData);

    // 判断角色
    const userRole = user.role || (isSuperAdmin ? 'super_admin' : 'user');
    isAdmin = isAdmin || userRole === 'admin' || userRole === 'super_admin';
    isSuperAdmin = isSuperAdmin || userRole === 'super_admin';

    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role: userRole },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: isSuperAdmin ? '超级管理员' : user.nickname,
        avatar: isSuperAdmin ? '👑' : user.avatar,
        address: user.address,
        role: userRole,
        isAdmin,
        isSuperAdmin,
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

    const role = user.role || 'user';
    const isSuperAdmin = role === 'super_admin';

    res.json({
      id: user._id,
      phone: user.phone,
      nickname: isSuperAdmin ? '超级管理员' : user.nickname,
      avatar: isSuperAdmin ? '👑' : user.avatar,
      address: user.address,
      location: user.location,
      gardenStats: user.gardenStats,
      role,
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin,
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

    if (isDefault) addresses.forEach(a => a.isDefault = false);

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
    res.status(500).json({ error: '更新地址失败' });
  }
});

module.exports = router;
