const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== API Gateway 状态检查 =====
const db = require('./lib/db');

// ===== 路由 =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/recommend', require('./routes/recommend'));
app.use('/api/garden', require('./routes/garden'));
app.use('/api/map', require('./routes/map'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/wechat-pay', require('./routes/wechat-pay'));
app.use('/api/auction', require('./routes/auction'));
app.use('/api/search', require('./routes/search'));


// ===== 健康检查 =====
app.get('/api/health', async (req, res) => {
  try {
    const { default: axios } = require('axios');
    const gw = process.env.API_GATEWAY_URL || 'http://100.96.54.109:3007';
    const gwRes = await axios.get(`${gw}/api/health`, {
      headers: { 'X-API-Key': '***REMOVED_API_KEY***' },
      timeout: 5000,
    });
    res.json({
      status: 'ok',
      gateway: gwRes.data,
      time: new Date().toISOString(),
    });
  } catch (e) {
    res.json({
      status: 'degraded',
      gatewayError: e.message,
      time: new Date().toISOString(),
    });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌸 Flower Shop Backend running on port ${PORT}`);
  console.log(`🔗 API Gateway: ${process.env.API_GATEWAY_URL || 'http://100.96.54.109:3007'}`);
  console.log(`📌 No direct MongoDB — all queries through API Gateway`);
});
