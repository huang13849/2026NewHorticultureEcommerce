/**
 * API Gateway 数据库客户端
 * 将所有 MongoDB 操作通过 API Gateway (http://100.96.54.109:3007/api/mongo) 进行
 * 不再直接连接 MongoDB
 *
 * 区域化图片 URL 重写:
 *   MINIO_REWRITE_FROM / MINIO_REWRITE_TO 环境变量
 *   都设了才生效;读操作返回前递归把字符串里的 FROM 替换为 TO。
 *   苏州国内版用:FROM=http://100.96.54.109:9000  TO=http://img.horiculture.club (或本地公网入口)
 *   Mac Mini / 海外不设环境变量 -> 零侵入。
 */

const axios = require('axios');
const API_KEY = '***REMOVED_API_KEY***';

const GATEWAY = process.env.API_GATEWAY_URL || 'http://100.96.54.109:3007';
const MONGO_BASE = `${GATEWAY}/api/mongo`;
const PG_BASE = `${GATEWAY}/api/pg`;

const client = axios.create({
  timeout: 15000,
  headers: { 'X-API-Key': API_KEY },
});

// ============ 图片 URL 重写 ============
const REWRITE_FROM = process.env.MINIO_REWRITE_FROM || '';
const REWRITE_TO = process.env.MINIO_REWRITE_TO || '';
const REWRITE_ENABLED = REWRITE_FROM && REWRITE_TO;

if (REWRITE_ENABLED) {
  console.log(`[db] MinIO URL rewrite enabled: ${REWRITE_FROM} -> ${REWRITE_TO}`);
}

function rewriteImages(data) {
  if (!REWRITE_ENABLED || data == null) return data;
  if (typeof data === 'string') {
    return data.includes(REWRITE_FROM) ? data.split(REWRITE_FROM).join(REWRITE_TO) : data;
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) data[i] = rewriteImages(data[i]);
    return data;
  }
  if (typeof data === 'object') {
    for (const k of Object.keys(data)) data[k] = rewriteImages(data[k]);
    return data;
  }
  return data;
}

/**
 * 查询文档列表
 * GET /api/mongo/:collection?filter={json}&sort={json}&page=1&limit=50&fields=a,b,c
 */
async function find(collection, { filter = {}, sort = {}, page, limit, fields } = {}) {
  const params = {
    filter: JSON.stringify(filter),
    sort: JSON.stringify(sort),
  };
  if (page) params.page = page;
  if (limit) params.limit = limit;
  if (fields) params.fields = fields;

  const res = await client.get(`${MONGO_BASE}/${collection}`, { params });
  return rewriteImages(res.data.data || []);
}

/**
 * 查询单个文档
 * GET /api/mongo/:collection/:id
 */
async function findById(collection, id) {
  const res = await client.get(`${MONGO_BASE}/${collection}/${id}`);
  return rewriteImages(res.data.data || null);
}

/**
 * 查询单个文档（通过 filter）
 */
async function findOne(collection, filter = {}) {
  const res = await client.get(`${MONGO_BASE}/${collection}`, {
    params: { filter: JSON.stringify(filter), limit: 1 },
  });
  const docs = res.data.data || [];
  return rewriteImages(docs[0] || null);
}

/**
 * 创建文档
 * POST /api/mongo/:collection
 */
async function create(collection, data) {
  const res = await client.post(`${MONGO_BASE}/${collection}`, data);
  return res.data.data || res.data;
}

/**
 * 更新文档
 * PUT /api/mongo/:collection/:id
 */
async function update(collection, id, data) {
  const res = await client.put(`${MONGO_BASE}/${collection}/${id}`, data);
  return res.data.data || res.data;
}

/**
 * 删除文档
 * DELETE /api/mongo/:collection/:id
 */
async function remove(collection, id) {
  const res = await client.delete(`${MONGO_BASE}/${collection}/${id}`);
  return res.data;
}

/**
 * 计数文档
 */
async function count(collection, filter = {}) {
  const res = await client.get(`${MONGO_BASE}/${collection}`, {
    params: { filter: JSON.stringify(filter), limit: 1, countOnly: 'true' },
  });
  return res.data.total || 0;
}

/**
 * 聚合查询
 * POST /api/mongo/:collection/aggregate
 */
async function aggregate(collection, pipeline) {
  const res = await client.post(`${MONGO_BASE}/${collection}/aggregate`, pipeline);
  return rewriteImages(res.data.data || []);
}

/**
 * 批量创建
 */
async function insertMany(collection, docs) {
  const res = await client.post(`${MONGO_BASE}/${collection}/bulk`, docs);
  return res.data;
}

/**
 * distinct 模拟 - 通过聚合实现
 */
async function distinct(collection, field, filter = {}) {
  const pipeline = [
    { $match: filter },
    { $group: { _id: `$${field}` } },
    { $project: { _id: 0, value: '$_id' } },
  ];
  const results = await aggregate(collection, pipeline);
  return results.map(r => r.value).filter(Boolean);
}



/**
 * PostgreSQL: 插入行（通过 API Gateway 写 Primary）
 */
async function pgInsert(database, table, data) {
  const res = await client.post(`${PG_BASE}/${database}/${table}`, data);
  return res.data.data || res.data;
}

/**
 * PostgreSQL: 查询表（通过 API Gateway，可 readFrom=standby）
 */
async function pgFind(database, table, { filter = {}, sort = '', page = 1, limit = 50, fields = '*', readFrom = 'primary' } = {}) {
  const res = await client.get(`${PG_BASE}/${database}/${table}`, {
    params: { filter: JSON.stringify(filter), sort, page, limit, fields, readFrom },
  });
  // pgFind 返回完整响应（含 data/total 等），递归改写 data 字段里的图片
  if (res.data && res.data.data) res.data.data = rewriteImages(res.data.data);
  return res.data;
}

module.exports = {
  find,
  findById,
  findOne,
  create,
  update,
  remove,
  count,
  aggregate,
  insertMany,
  distinct,
  pgInsert,
  pgFind,
  rewriteImages, // 暴露给其他模块使用（如直接 axios 调用 gateway 的地方）
};
