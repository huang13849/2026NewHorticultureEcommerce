/**
 * PostgreSQL (CNPG) 客户端
 * 通过 pgbouncer 100.96.54.109:5433 -> CNPG pg-ha-master-drill (k3s)
 * 替换旧的 API Gateway MongoDB 链路 (3007)
 *
 * 环境变量:
 *   PG_HOST  - pgbouncer host (默认 100.96.54.109)
 *   PG_PORT  - pgbouncer port (默认 5433)
 *   PG_USER  - postgres (superuser; reset by deploy script)
 *   PG_PASSWORD - 必需
 *   PG_DATABASE - 默认 supply_chain
 */
const { Pool } = require('pg');

const PG_CONFIG = {
  host:     process.env.PG_HOST     || '100.96.54.109',
  port:     parseInt(process.env.PG_PORT || '5433', 10),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || (function(){ throw new Error('PG_PASSWORD env required'); })(),
  database: process.env.PG_DATABASE || 'supply_chain',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(PG_CONFIG);

pool.on('error', (err) => {
  console.error('[pg] idle client error:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const dur = Date.now() - start;
  if (dur > 1000) console.warn('[pg] slow query ' + dur + 'ms: ' + text.slice(0, 80));
  return res;
}

async function findOne(sql, params) {
  const res = await query(sql, params || []);
  return res.rows[0] || null;
}

async function findMany(sql, params) {
  const res = await query(sql, params || []);
  return res.rows;
}

async function close() {
  await pool.end();
}

async function ping() {
  const res = await query('SELECT current_database() AS db, inet_server_addr() AS addr, version() AS v');
  return res.rows[0];
}

module.exports = { pool, query, findOne, findMany, close, ping };
