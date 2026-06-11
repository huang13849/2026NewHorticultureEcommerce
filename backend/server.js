const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== MongoDB 连接 =====
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:Hy%401987921@100.67.126.90:27017/supply_chain?authSource=admin';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ===== 路由 =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/recommend', require('./routes/recommend'));
app.use('/api/garden', require('./routes/garden'));
app.use('/api/map', require('./routes/map'));

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌸 Flower Shop Backend running on port ${PORT}`);
});
