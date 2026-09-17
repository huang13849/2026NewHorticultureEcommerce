const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== 路由 =====
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/user',     require('./routes/user'));
app.use('/api/session',  require('./routes/sessions'));
app.use('/api/products', require('./routes/products'));
app.use('/api/recommend',require('./routes/recommend'));
app.use('/api/garden',   require('./routes/garden'));
app.use('/api/map',      require('./routes/map'));
app.use('/api/payment',  require('./routes/payment'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/wechat-pay',require('./routes/wechat-pay'));
app.use('/api/auction',  require('./routes/auction'));
app.use('/api/search',   require('./routes/search'));
app.use('/api/scenes',   require('./routes/scenes'));
app.use('/api/currency', require('./routes/currency'));

// ===== 健康检查 — ping CNPG (pgbouncer) 替换死掉的 3007 gateway =====
app.get('/api/health', async (req, res) => {
  try {
    const pg = require('./lib/pg');
    const pgInfo = await pg.ping();
    res.json({
      status: 'ok',
      database: pgInfo,
      time: new Date().toISOString(),
    });
  } catch (e) {
    res.json({
      status: 'degraded',
      error: e.message,
      time: new Date().toISOString(),
    });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Flower Shop Backend running on port ${PORT}`);
  console.log(`PG (CNPG via pgbouncer): ${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`);
});
