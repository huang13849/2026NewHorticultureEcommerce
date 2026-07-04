/**
 * 认证路由 — 支持验证码登录 + 密码登录（跨境 SSO：club/space 共用同一 mongo users）
 * 密码校验优先级：mongo users.passwordHash → 兼容 SUPER_ADMIN 硬编码
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== 超级管理员配置（fallback，用于首次初始化）=====
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || '18511987921';
// 兼容旧密码；migration 后应从 mongo user.passwordHash 读
const SUPER_ADMIN_PASSWORD_HASH_FALLBACK = bcrypt.hashSync(process.env.SUPER_ADMIN_PASSWORD || 'Hy@1111111', 10);

// ===== 手机号 + 验证码/密码 登录 =====
router.post('/login', async (req, res) => {
  try {
    const { phone, code, password, deviceInfo } = req.body;

    if (!phone) {
      return res.status(400).json({ error: '手机号必填' });
    }

    // 先查 mongo user
    let users = await db.find('users', { filter: { phone } });
    let user = users[0];

    let isAdmin = false;
    let isSuperAdmin = false;

    if (password) {
      // 密码登录路径：优先校验 mongo user.passwordHash
      let passOk = false;
      if (user && user.passwordHash) {
        passOk = bcrypt.compareSync(password, user.passwordHash);
      }
      // fallback：硬编码超管
      if (!passOk && phone === SUPER_ADMIN_PHONE) {
        passOk = bcrypt.compareSync(password, SUPER_ADMIN_PASSWORD_HASH_FALLBACK);
        if (passOk) { isAdmin = true; isSuperAdmin = true; }
      }
      if (!passOk) {
        return res.status(400).json({ error: '密码错误' });
      }
    } else if (code) {
      // 验证码登录
      if (code !== '123456') {
        return res.status(400).json({ error: '验证码错误' });
      }
    } else {
      return res.status(400).json({ error: '请输入验证码或密码' });
    }

    // 首次登录：创建用户
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

    // 更新登录时间 & 超管兜底
    const updateData = { lastLoginAt: new Date().toISOString() };
    if (isSuperAdmin && user.role !== 'super_admin') {
      updateData.role = 'super_admin';
      updateData.nickname = '超级管理员';
      updateData.avatar = '👑';
    }
    if (deviceInfo) updateData.deviceInfo = deviceInfo;
    await db.update('users', user._id, updateData);

    // 最终角色
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
        nickname: isSuperAdmin ? '超级管理员' : (user.nickname || `花友${String(phone).slice(-4)}`),
        avatar: isSuperAdmin ? '👑' : (user.avatar || ''),
        address: user.address || [],
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

// ===== 修改密码 =====
router.post('/set-password', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: '未登录' });
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    await db.update('users', decoded.userId, { passwordHash });
    res.json({ message: '密码已更新' });
  } catch (err) {
    console.error('set-password error:', err);
    res.status(400).json({ error: 'token 无效或更新失败' });
  }
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


// ===== SSO Issue (仅内网, 接受 phone -> 签 JWT, 不做密码校验) =====
// 前置: 调用方已用 Zitadel 校验过身份 (next-app /api/auth/sso-restore)
router.post('/sso-issue', async (req, res) => {
  try {
    // 简单内网 secret 校验, 避免公网被滥用
    const secret = req.headers['x-sso-secret'];
    if (secret !== (process.env.SSO_INTERNAL_SECRET || 'zitadel-sso-2026')) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { phone } = req.body || {};
    if (!/^1[3-9]\d{9}$/.test(phone || '')) return res.status(400).json({ error: 'invalid_phone' });

    // 查 / 建 mongo user
    let users = await db.find('users', { filter: { phone } });
    let user = users[0];
    if (!user) {
      const ins = await db.insert('users', {
        phone,
        nickname: `花友${phone.slice(-4)}`,
        role: 'user',
        createdAt: new Date(),
        source: 'zitadel_sso',
      });
      user = { _id: ins.insertedId || ins._id, phone, role: 'user', nickname: `花友${phone.slice(-4)}` };
    }

    const role = user.role || (phone === SUPER_ADMIN_PHONE ? 'super_admin' : 'user');
    const isSuperAdmin = role === 'super_admin';
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: isSuperAdmin ? '超级管理员' : (user.nickname || `花友${phone.slice(-4)}`),
        avatar: isSuperAdmin ? '👑' : (user.avatar || ''),
        address: user.address || [],
        role,
        isAdmin: role === 'admin' || isSuperAdmin,
        isSuperAdmin,
      },
    });
  } catch (e) {
    console.error('[sso-issue]', e);
    res.status(500).json({ error: 'sso_failed', detail: e.message });
  }
});

module.exports = router;
