/**
 * 管理员路由 — 支付配置管理
 * 仅超级管理员可访问
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';
const CONFIG_COLLECTION = 'admin_config';

// ===== 管理员鉴权中间件 =====
function requireSuperAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '未登录' });

  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: '需要超级管理员权限' });
    }
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'token 无效' });
  }
}

// ===== 获取支付配置（脱敏） =====
router.get('/payment-config', requireSuperAdmin, async (req, res) => {
  try {
    let configs = await db.find(CONFIG_COLLECTION, {
      filter: { type: { $in: ['wechat_pay', 'alipay'] } },
    });

    // 确保每个配置都有默认值
    const wechat = configs.find(c => c.type === 'wechat_pay') || {
      type: 'wechat_pay',
      appId: process.env.WECHAT_APP_ID || 'wx1670cc892b5373b8',
      mchId: process.env.WECHAT_MCH_ID || '',
      apiV3Key: '',
      serialNo: process.env.WECHAT_SERIAL_NO || '',
      privateKey: '',
      notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://209.141.34.146/api/wechat-pay/notify',
      enabled: false,
    };

    const alipay = configs.find(c => c.type === 'alipay') || {
      type: 'alipay',
      appId: '',
      merchantPrivateKey: '',
      alipayPublicKey: '',
      notifyUrl: 'https://209.141.34.146/api/alipay/notify',
      gateway: 'https://openapi.alipay.com/gateway.do',
      enabled: false,
    };

    res.json({
      wechat: {
        appId: wechat.appId,
        mchId: wechat.mchId,
        apiV3Key: wechat.apiV3Key ? wechat.apiV3Key.slice(0, 4) + '****' : '',
        apiV3KeySet: !!wechat.apiV3Key,
        serialNo: wechat.serialNo,
        privateKeySet: !!(wechat.privateKey && wechat.privateKey.length > 10),
        notifyUrl: wechat.notifyUrl,
        enabled: wechat.enabled || false,
      },
      alipay: {
        appId: alipay.appId,
        merchantPrivateKeySet: !!(alipay.merchantPrivateKey && alipay.merchantPrivateKey.length > 10),
        alipayPublicKeySet: !!(alipay.alipayPublicKey && alipay.alipayPublicKey.length > 10),
        notifyUrl: alipay.notifyUrl,
        gateway: alipay.gateway,
        enabled: alipay.enabled || false,
      },
    });
  } catch (err) {
    console.error('Get payment config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 保存微信支付配置 =====
router.put('/wechat-pay', requireSuperAdmin, async (req, res) => {
  try {
    const { appId, mchId, apiV3Key, serialNo, privateKey, notifyUrl, enabled } = req.body;

    if (!mchId) return res.status(400).json({ error: '商户号必填' });

    // 查找已有配置
    let configs = await db.find(CONFIG_COLLECTION, { filter: { type: 'wechat_pay' } });
    let config = configs[0];

    const updateData = {
      type: 'wechat_pay',
      appId: appId || 'wx1670cc892b5373b8',
      mchId,
      serialNo: serialNo || '',
      notifyUrl: notifyUrl || 'https://209.141.34.146/api/wechat-pay/notify',
      enabled: enabled || false,
      updatedAt: new Date().toISOString(),
    };

    // 只在提供了新值时更新密钥（不覆盖为空）
    if (apiV3Key) updateData.apiV3Key = apiV3Key;
    if (privateKey) updateData.privateKey = privateKey;

    if (config) {
      // 合并：保留未提交的密钥字段
      const merged = { ...config, ...updateData };
      // 如果没传 apiV3Key 且之前有，保留
      if (!apiV3Key && config.apiV3Key) merged.apiV3Key = config.apiV3Key;
      if (!privateKey && config.privateKey) merged.privateKey = config.privateKey;

      await db.update(CONFIG_COLLECTION, config._id, merged);
    } else {
      updateData.createdAt = new Date().toISOString();
      await db.create(CONFIG_COLLECTION, updateData);
    }

    res.json({ message: '微信支付配置已保存', enabled: updateData.enabled });
  } catch (err) {
    console.error('Save wechat pay config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 保存支付宝配置 =====
router.put('/alipay', requireSuperAdmin, async (req, res) => {
  try {
    const { appId, merchantPrivateKey, alipayPublicKey, notifyUrl, gateway, enabled } = req.body;

    if (!appId) return res.status(400).json({ error: '支付宝 AppID 必填' });

    let configs = await db.find(CONFIG_COLLECTION, { filter: { type: 'alipay' } });
    let config = configs[0];

    const updateData = {
      type: 'alipay',
      appId,
      notifyUrl: notifyUrl || 'https://209.141.34.146/api/alipay/notify',
      gateway: gateway || 'https://openapi.alipay.com/gateway.do',
      enabled: enabled || false,
      updatedAt: new Date().toISOString(),
    };

    if (merchantPrivateKey) updateData.merchantPrivateKey = merchantPrivateKey;
    if (alipayPublicKey) updateData.alipayPublicKey = alipayPublicKey;

    if (config) {
      const merged = { ...config, ...updateData };
      if (!merchantPrivateKey && config.merchantPrivateKey) merged.merchantPrivateKey = config.merchantPrivateKey;
      if (!alipayPublicKey && config.alipayPublicKey) merged.alipayPublicKey = config.alipayPublicKey;

      await db.update(CONFIG_COLLECTION, config._id, merged);
    } else {
      updateData.createdAt = new Date().toISOString();
      await db.create(CONFIG_COLLECTION, updateData);
    }

    res.json({ message: '支付宝配置已保存', enabled: updateData.enabled });
  } catch (err) {
    console.error('Save alipay config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 测试支付连接 =====
router.post('/test-connection', requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'wechat' | 'alipay'

    if (type === 'wechat') {
      let configs = await db.find(CONFIG_COLLECTION, { filter: { type: 'wechat_pay' } });
      const config = configs[0];
      if (!config || !config.mchId || !config.apiV3Key || !config.privateKey) {
        return res.json({ success: false, message: '微信支付配置不完整，缺少商户号/V3密钥/私钥' });
      }
      // 尝试调微信证书接口验证
      try {
        const axios = require('axios');
        const crypto = require('crypto');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const url = '/v3/certificates';
        const message = `GET\n${url}\n${timestamp}\n${nonceStr}\n\n`;
        const sign = crypto.createSign('sha256');
        sign.update(message);
        sign.end();
        const signature = sign.sign(config.privateKey.replace(/\\n/g, '\n'), 'base64');
        const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`;

        const resp = await axios({
          method: 'GET',
          url: `https://api.mch.weixin.qq.com${url}`,
          headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
          timeout: 10000,
        });

        res.json({ success: true, message: `微信支付连接成功，商户号: ${config.mchId}` });
      } catch (wxErr) {
        const errMsg = wxErr.response?.data?.message || wxErr.message;
        res.json({ success: false, message: `微信支付连接失败: ${errMsg}` });
      }
    } else if (type === 'alipay') {
      let configs = await db.find(CONFIG_COLLECTION, { filter: { type: 'alipay' } });
      const config = configs[0];
      if (!config || !config.appId || !config.merchantPrivateKey) {
        return res.json({ success: false, message: '支付宝配置不完整' });
      }
      res.json({ success: false, message: '支付宝连接测试待实现' });
    } else {
      res.status(400).json({ error: 'type 必须为 wechat 或 alipay' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 获取系统概览（管理仪表盘） =====
router.get('/dashboard', requireSuperAdmin, async (req, res) => {
  try {
    // 用户统计
    const users = await db.find('users', { limit: 1 });
    // 订单统计
    const orders = await db.find('orders', { limit: 1 });
    // 商品统计
    const products = await db.find('products', { limit: 1 });

    // 支付配置状态
    let wechatConfigs = await db.find(CONFIG_COLLECTION, { filter: { type: 'wechat_pay' } });
    let alipayConfigs = await db.find(CONFIG_COLLECTION, { filter: { type: 'alipay' } });

    res.json({
      stats: {
        users: users.length,
        orders: orders.length,
        products: products.length,
      },
      payment: {
        wechat: {
          configured: !!(wechatConfigs[0]?.mchId && wechatConfigs[0]?.apiV3Key && wechatConfigs[0]?.privateKey),
          enabled: wechatConfigs[0]?.enabled || false,
        },
        alipay: {
          configured: !!(alipayConfigs[0]?.appId && alipayConfigs[0]?.merchantPrivateKey),
          enabled: alipayConfigs[0]?.enabled || false,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
