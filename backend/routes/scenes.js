/**
 * scenes — 庭院园林·成功案例 场景图 (只读代理)
 * 转发到 ubuntu-master 上的 scene-service (3012, 经 Tailscale)。
 * 管理(增改删)请用 scene-service 管理页: http://100.96.54.109:8088/scenes/
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();

const SCENE_SERVICE = process.env.SCENE_SERVICE_URL || 'http://100.96.54.109:3012';

// GET /api/scenes?region=cn|global&enabled=true&limit=6
router.get('/', async (req, res) => {
  try {
    const r = await axios.get(`${SCENE_SERVICE}/api/scenes`, {
      params: req.query,
      timeout: 8000,
    });
    res.json(r.data);
  } catch (e) {
    res.json({ scenes: [], total: 0 });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await axios.get(`${SCENE_SERVICE}/api/scenes/${req.params.id}`, { timeout: 8000 });
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'scene fetch failed' });
  }
});

module.exports = router;
