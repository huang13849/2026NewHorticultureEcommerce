/**
 * API Gateway 数据库客户端
 * 将所有 MongoDB 操作通过 API Gateway (http://100.96.54.109:3007/api/mongo) 进行
 * 不再直接连接 MongoDB
 */

const axios = require('axios');
const API_KEY = '***REMOVED_API_KEY***';

const GATEWAY = process.env.API_GATEWAY_URL || 'http://100.96.54.109:3007';
const MONGO_BASE = `${GATEWAY}/api/mongo`;

const client = axios.create({
  timeout: 15000,
  headers: { 'X-API-Key': API_KEY },
});

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
  return res.data.data || [];
}

/**
 * 查询单个文档
 * GET /api/mongo/:collection/:id
 */
async function findById(collection, id) {
  const res = await client.get(`${MONGO_BASE}/${collection}/${id}`);
  return res.data.data || null;
}

/**
 * 查询单个文档（通过 filter）
 */
async function findOne(collection, filter = {}) {
  const res = await client.get(`${MONGO_BASE}/${collection}`, {
    params: { filter: JSON.stringify(filter), limit: 1 },
  });
  const docs = res.data.data || [];
  return docs[0] || null;
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
  return res.data.data || [];
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
};
