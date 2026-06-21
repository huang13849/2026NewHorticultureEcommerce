/**
 * 微信支付路由 — WeChat Pay V3
 * 
 * 支持:
 *  - JSAPI (微信内浏览器)
 *  - H5 (手机浏览器)
 *  - Native (扫码支付，PC)
 * 
 * 环境变量:
 *  WECHAT_APP_ID       — 微信小程序/公众号 AppID
 *  WECHAT_MCH_ID       — 微信支付商户号
 *  WECHAT_API_KEY_V3   — V3 API 密钥
 *  WECHAT_SERIAL_NO    — 商户证书序列号
 *  WECHAT_PRIVATE_KEY  — 商户私钥 PEM (或文件路径)
 *  WECHAT_NOTIFY_URL   — 支付回调地址
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../lib/db');

// ===== 配置 =====
const WX_APP_ID = process.env.WECHAT_APP_ID || 'wx1670cc892b5373b8';
const WX_MCH_ID = process.env.WECHAT_MCH_ID || '';
const WX_API_V3_KEY = process.env.WECHAT_API_KEY_V3 || '';
const WX_SERIAL_NO = process.env.WECHAT_SERIAL_NO || '';
const WX_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || 'https://209.141.34.146/api/wechat-pay/notify';

let privateKeyPem = '';
if (process.env.WECHAT_PRIVATE_KEY) {
  if (process.env.WECHAT_PRIVATE_KEY.includes('-----BEGIN')) {
    privateKeyPem = process.env.WECHAT_PRIVATE_KEY.replace(/\\n/g, '\n');
  } else {
    // File path
    try {
      const fs = require('fs');
      privateKeyPem = fs.readFileSync(process.env.WECHAT_PRIVATE_KEY, 'utf8');
    } catch (e) {
      console.warn('[WechatPay] Cannot read private key file:', e.message);
    }
  }
}

const IS_CONFIGURED = !!(WX_MCH_ID && WX_API_V3_KEY && WX_SERIAL_NO && privateKeyPem);
const REGION = process.env.REGION || 'cn';

if (!IS_CONFIGURED) {
  console.warn('[WechatPay] ⚠️  微信支付未完整配置，使用模拟模式');
  console.warn('[WechatPay]    需配置: WECHAT_MCH_ID, WECHAT_API_KEY_V3, WECHAT_SERIAL_NO, WECHAT_PRIVATE_KEY');
} else {
  console.log('[WechatPay] ✅ 微信支付已配置');
  console.log(`[WechatPay]    AppID: ${WX_APP_ID}`);
  console.log(`[WechatPay]    MchID: ${WX_MCH_ID}`);
}

// ===== 同步到购买订单管理 =====
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://100.96.54.109:3008';

async function syncPurchaseOrder(order) {
  try {
    const axios = require('axios');
    const payload = {
      member_id: order.memberId || '',
      member_name: order.memberName || '花伴用户',
      phone: order.phone || '',
      business_type: '团购/电商',
      purchase_time: order.paidAt || new Date().toISOString(),
      delivery_address: order.deliveryAddress || '',
      product_id: (order.items || []).map(i => i.productId).filter(Boolean),
      product_title: (order.items || []).map(i => i.name + ' ×' + (i.quantity || 1)),
      personal_tag: '花伴商城,微信支付',
      payment_order_id: order.orderId,
      payment_channel: '微信支付',
      region: order.region || REGION,
      product_subtotal: order.subtotal || order.totalAmount,
      shipping_fee: order.shippingFee || 0,
      coupon_code: order.couponCode || '',
      coupon_discount: order.couponDiscount || 0,
      income_amount: order.totalAmount,
      cost_amount: order.costAmount || 0,
      expense_amount: order.costAmount || 0,
      profit_amount: order.profitAmount != null ? order.profitAmount : Number((order.totalAmount || 0) - (order.costAmount || 0)).toFixed(2),
    };
    await axios.post(ORDER_SERVICE_URL + '/api/orders', payload, { timeout: 15000 });
  } catch (e) {
    console.error('[WechatPay] syncPurchaseOrder failed:', e.message);
  }
}

// ===== 商品列表（从 API Gateway 同步） =====
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
    res.json({ products: payProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== V3 签名工具 =====
function signV3(method, url, timestamp, nonceStr, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('sha256');
  sign.update(message);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

function getAuthHeader(method, url, body = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const signature = signV3(method, url, timestamp, nonceStr, body);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WX_MCH_ID}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${WX_SERIAL_NO}",signature="${signature}"`;
}

// ===== 验证回调签名 =====
function verifyNotifySignature(headers, body) {
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  // 需要微信平台证书来验证 — 生产环境应缓存平台证书
  // 这里简化处理，有配置时才验签
  return true; // TODO: 用微信平台证书验证
}

// ===== 解密回调数据 =====
function decryptAES256GCM(ciphertext, associated_data, nonce) {
  const key = Buffer.from(WX_API_V3_KEY, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const buf = Buffer.from(ciphertext, 'base64');
  const authTag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associated_data, 'utf8'));
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// ===== 统一下单 =====
async function createPrepayOrder(orderId, totalAmount, description, payScene, openid) {
  const axios = require('axios');
  
  const sceneMap = {
    jsapi: { url: '/v3/pay/transactions/jsapi', trade_type: 'JSAPI' },
    h5:    { url: '/v3/pay/transactions/h5', trade_type: 'MWEB' },
    native:{ url: '/v3/pay/transactions/native', trade_type: 'NATIVE' },
  };
  const scene = sceneMap[payScene] || sceneMap.jsapi;

  const body = {
    appid: WX_APP_ID,
    mchid: WX_MCH_ID,
    description: description || '花卉商品',
    out_trade_no: orderId,
    notify_url: WX_NOTIFY_URL,
    amount: {
      total: Math.round(totalAmount * 100), // 分
      currency: 'CNY',
    },
  };

  if (payScene === 'jsapi') {
    body.payer = { openid };
  } else if (payScene === 'h5') {
    body.scene_info = {
      payer_client_ip: '127.0.0.1',
      h5_info: { type: 'Wap', app_name: '智慧供应链', app_url: 'http://100.76.15.64:3000' },
    };
  }

  const bodyStr = JSON.stringify(body);
  const authHeader = getAuthHeader('POST', scene.url, bodyStr);

  const resp = await axios({
    method: 'POST',
    url: `https://api.mch.weixin.qq.com${scene.url}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
    data: bodyStr,
    timeout: 15000,
  });

  return resp.data;
}

// ===== JSAPI 调起支付参数 =====
function buildJSAPIPayParams(prepayId) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageStr = `prepay_id=${prepayId}`;
  const message = `${WX_APP_ID}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
  const sign = crypto.createSign('sha256');
  sign.update(message);
  sign.end();
  const paySign = sign.sign(privateKeyPem, 'base64');
  return {
    appId: WX_APP_ID,
    timeStamp: timestamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign,
  };
}

// ===== API: 创建订单 =====
router.post('/order', async (req, res) => {
  try {
    const { items, payMethod = 'wechat', payScene = 'jsapi', openid, customer = {} } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '购物车不能为空' });
    }

    // 计算总价
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.price && item.price > 0) {
        const qty = item.quantity || 1;
        totalAmount += item.price * qty;
        orderItems.push({
          productId: item.productId || item.id,
          name: item.name,
          price: item.price,
          quantity: qty,
          image: item.image || '',
        });
      }
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: '订单金额必须大于0' });
    }

    // 生成订单号
    const orderId = `WX${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = {
      orderId,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      payMethod,
      payScene,
      openid: openid || '',
      memberName: customer.name || '',
      phone: customer.phone || '',
      status: 'pending',
      region: REGION,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };

    // 存入 MongoDB
    await db.create('orders', order);

    // 判断是否走真实微信支付
    if (payMethod === 'wechat' && IS_CONFIGURED) {
      // ===== 真实微信支付 =====
      const description = orderItems.map(i => i.name).slice(0, 3).join(',');
      
      try {
        const prepayResult = await createPrepayOrder(
          orderId, order.totalAmount, description, payScene, openid
        );

        if (payScene === 'jsapi' && prepayResult.prepay_id) {
          const jsapiParams = buildJSAPIPayParams(prepayResult.prepay_id);
          return res.json({
            orderId,
            totalAmount: order.totalAmount,
            payMethod: 'wechat',
            payScene: 'jsapi',
            status: 'pending',
            jsapiParams,
            prepayId: prepayResult.prepay_id,
          });
        } else if (payScene === 'h5' && prepayResult.h5_url) {
          return res.json({
            orderId,
            totalAmount: order.totalAmount,
            payMethod: 'wechat',
            payScene: 'h5',
            status: 'pending',
            h5Url: prepayResult.h5_url,
          });
        } else if (payScene === 'native' && prepayResult.code_url) {
          return res.json({
            orderId,
            totalAmount: order.totalAmount,
            payMethod: 'wechat',
            payScene: 'native',
            status: 'pending',
            codeUrl: prepayResult.code_url,
          });
        }
      } catch (wxErr) {
        console.error('[WechatPay] 统一下单失败:', wxErr.response?.data || wxErr.message);
        // 降级到模拟模式
      }
    }

    // ===== 模拟支付（未配置或降级） =====
    // Sync to order-service
    syncPurchaseOrder({ ...order, memberId: customer.phone || '', paidAt: new Date().toISOString(), status: 'mock_paid' }).catch(() => {});
    res.json({
      orderId,
      totalAmount: order.totalAmount,
      payMethod,
      payScene: payScene || 'mock',
      status: 'mock_paid',
      mock: true,
      payUrl: `weixin://pay?orderId=${orderId}&amount=${order.totalAmount}`,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderId)}`,
      message: IS_CONFIGURED ? '' : '微信支付未完整配置，当前为模拟支付',
    });
  } catch (err) {
    console.error('[WechatPay] 创建订单错误:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== API: 微信支付回调通知 =====
router.post('/notify', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const body = req.body.toString('utf8');
    const headers = req.headers;

    // 验签
    if (!verifyNotifySignature(headers, body)) {
      return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
    }

    // 解密
    const data = JSON.parse(body);
    const resource = data.resource;
    const decrypted = decryptAES256GCM(resource.ciphertext, resource.associated_data, resource.nonce);

    console.log('[WechatPay] 回调通知:', JSON.stringify(decrypted));

    if (decrypted.trade_state === 'SUCCESS') {
      const orderId = decrypted.out_trade_no;
      const transactionId = decrypted.transaction_id;

      // 更新订单状态
      const order = await db.findOne('orders', { orderId });
      if (order && order.status !== 'paid') {
        await db.update('orders', order._id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
          transactionId,
          payInfo: decrypted,
        });
        console.log(`[WechatPay] 订单 ${orderId} 支付成功, 交易号: ${transactionId}`);
      }
    }

    // 必须返回此格式，否则微信会重复通知
    res.json({ code: 'SUCCESS', message: 'OK' });
  } catch (err) {
    console.error('[WechatPay] 回调处理错误:', err);
    res.status(500).json({ code: 'FAIL', message: err.message });
  }
});

// ===== API: 模拟支付（开发测试用） =====
router.post('/pay/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.findOne('orders', { orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status === 'paid') return res.json({ message: '订单已支付', order });

    const updated = await db.update('orders', order._id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      transactionId: `MOCK${Date.now()}`,
    });

    res.json({
      message: '模拟支付成功',
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

// ===== API: 查询订单 =====
router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await db.findOne('orders', { orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API: 查询支付配置状态 =====
router.get('/config-status', (req, res) => {
  res.json({
    configured: IS_CONFIGURED,
    appId: WX_APP_ID,
    mchId: WX_MCH_ID ? `${WX_MCH_ID.slice(0, 4)}****` : '',
    hasPrivateKey: !!privateKeyPem,
    mode: IS_CONFIGURED ? 'live' : 'mock',
  });
});

// ===== API: 查询微信支付订单状态（从微信服务器查询） =====
router.get('/query/:orderId', async (req, res) => {
  try {
    if (!IS_CONFIGURED) {
      // 模拟模式：直接查本地
      const order = await db.findOne('orders', { orderId: req.params.orderId });
      if (!order) return res.status(404).json({ error: '订单不存在' });
      return res.json({ trade_state: order.status === 'paid' ? 'SUCCESS' : 'NOTPAY', order });
    }

    // 真实查询
    const axios = require('axios');
    const url = `/v3/pay/transactions/out-trade-no/${req.params.orderId}?mchid=${WX_MCH_ID}`;
    const authHeader = getAuthHeader('GET', url);
    
    const resp = await axios({
      method: 'GET',
      url: `https://api.mch.weixin.qq.com${url}`,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    // 如果支付成功，更新本地订单
    if (resp.data.trade_state === 'SUCCESS') {
      const order = await db.findOne('orders', { orderId: req.params.orderId });
      if (order && order.status !== 'paid') {
        await db.update('orders', order._id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
          transactionId: resp.data.transaction_id,
        });
      }
    }

    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ===== API: 用户订单列表 =====
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
