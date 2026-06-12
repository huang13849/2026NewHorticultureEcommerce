const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== 中间件：验证登录 =====
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    res.status(401).json({ error: '登录已过期' });
  }
}

// ===== 获取可种植的花卉列表 =====
router.get('/plants', async (req, res) => {
  try {
    const plants = await db.find('plants', {
      filter: { isActive: true },
      sort: { growDays: 1 },
    });
    res.json({ plants });
  } catch (err) {
    console.error('Plants error:', err);
    res.status(500).json({ error: '获取花卉列表失败' });
  }
});

// ===== 获取我的花园 =====
router.get('/my-garden', authMiddleware, async (req, res) => {
  try {
    const plots = await db.find('gardenplots', {
      filter: { userId: req.userId },
      sort: { plantedAt: -1 },
    });

    // 手动 populate plantId
    const now = new Date();
    const result = await Promise.all(plots.map(async (plot) => {
      let plant = null;
      if (plot.plantId) {
        try {
          plant = await db.findById('plants', plot.plantId);
        } catch (e) { /* ignore */ }
      }

      const plantedAt = new Date(plot.plantedAt || now);
      const daysPassed = Math.floor((now - plantedAt) / (1000 * 60 * 60 * 24));
      const totalDays = plant?.growDays || 100;
      const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
      const isMature = progress >= 100 && !plot.claimedAt;
      const stage = getStage(daysPassed, totalDays);

      return {
        id: plot._id,
        plant: plant,
        plantName: plant?.name || '未知花卉',
        plantId: plot.plantId,
        plantedAt: plot.plantedAt,
        daysPassed,
        totalDays,
        progress,
        isMature,
        stage,
        status: plot.status || (isMature ? 'mature' : 'growing'),
        currentDay: daysPassed,
        growDays: totalDays,
        currentStageEmoji: stage.emoji,
        waterCount: plot.waterCount || 0,
        lastWateredAt: plot.lastWateredAt,
        canWater: canWaterToday(plot.lastWateredAt),
        claimedAt: plot.claimedAt,
        checkInDates: plot.checkInDates || [],
      };
    }));

    // 统计
    const stats = {
      totalPlots: plots.length,
      growing: result.filter(p => !p.isMature && !p.claimedAt).length,
      mature: result.filter(p => p.isMature && !p.claimedAt).length,
      claimed: result.filter(p => p.claimedAt).length,
    };

    res.json({ garden: result, stats });
  } catch (err) {
    console.error('Garden error:', err);
    res.status(500).json({ error: '获取花园失败' });
  }
});

// ===== 种花 =====
router.post('/plant', authMiddleware, async (req, res) => {
  try {
    const { plantId } = req.body;
    if (!plantId) return res.status(400).json({ error: '请选择花卉' });

    const plant = await db.findById('plants', plantId);
    if (!plant) return res.status(404).json({ error: '花卉不存在' });

    // 检查是否已经种了这个花
    const existing = await db.find('gardenplots', {
      filter: { userId: req.userId, plantId, claimedAt: { $exists: false } },
    });
    if (existing.length > 0) {
      return res.status(400).json({ error: `你已经种了一棵${plant.name}，请先照料完成` });
    }

    const plot = await db.create('gardenplots', {
      userId: req.userId,
      plantId,
      status: 'growing',
      plantedAt: new Date().toISOString(),
      waterCount: 0,
    });

    res.json({
      message: `🌱 成功种下${plant.name}！`,
      plot: {
        id: plot._id || plot.insertedId,
        plantId,
        plantedAt: plot.plantedAt || new Date().toISOString(),
        totalDays: plant.growDays,
      },
    });
  } catch (err) {
    console.error('Plant error:', err);
    res.status(500).json({ error: '种花失败' });
  }
});

// ===== 浇水 =====
router.post('/water/:plotId', authMiddleware, async (req, res) => {
  try {
    const plot = await db.findById('gardenplots', req.params.plotId);
    if (!plot) return res.status(404).json({ error: '花圃不存在' });
    if (plot.userId !== req.userId) return res.status(403).json({ error: '不是你的花' });

    if (!canWaterToday(plot.lastWateredAt)) {
      return res.status(400).json({ error: '今天已经浇过水了，明天再来吧！' });
    }

    const now = new Date();
    const waterCount = (plot.waterCount || 0) + 1;

    await db.update('gardenplots', req.params.plotId, {
      waterCount,
      lastWateredAt: now.toISOString(),
    });

    const plantedAt = new Date(plot.plantedAt || now);
    const daysPassed = Math.floor((now - plantedAt) / (1000 * 60 * 60 * 24));
    const plant = await db.findById('plants', plot.plantId);
    const totalDays = plant?.growDays || 100;

    // 浇水加速：每次浇水减少 0.5 天
    const bonusDays = waterCount * 0.5;
    const adjustedProgress = Math.min(100, Math.round(((daysPassed + bonusDays) / totalDays) * 100));

    res.json({
      message: '💧 浇水成功！花开得更美了',
      waterCount,
      progress: adjustedProgress,
      bonusDays,
    });
  } catch (err) {
    console.error('Water error:', err);
    res.status(500).json({ error: '浇水失败' });
  }
});

// ===== 领取成熟花卉（免费赠送） =====
router.post('/claim/:plotId', authMiddleware, async (req, res) => {
  try {
    const plot = await db.findById('gardenplots', req.params.plotId);
    if (!plot) return res.status(404).json({ error: '花圃不存在' });
    if (plot.userId !== req.userId) return res.status(403).json({ error: '不是你的花' });
    if (plot.claimedAt) return res.status(400).json({ error: '已经领取过了' });

    const now = new Date();
    const plantedAt = new Date(plot.plantedAt || now);
    const daysPassed = Math.floor((now - plantedAt) / (1000 * 60 * 60 * 24));
    const bonusDays = (plot.waterCount || 0) * 0.5;
    const plant = await db.findById('plants', plot.plantId);
    const totalDays = plant?.growDays || 100;

    if (daysPassed + bonusDays < totalDays) {
      const remaining = Math.ceil(totalDays - daysPassed - bonusDays);
      return res.status(400).json({ error: `还没成熟哦，还需 ${remaining} 天` });
    }

    // 检查收货地址
    const user = await db.findById('users', req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const defaultAddr = user.address?.find(a => a.isDefault) || user.address?.[0];
    if (!defaultAddr) {
      return res.status(400).json({ error: '请先设置收货地址' });
    }

    await db.update('gardenplots', req.params.plotId, {
      claimedAt: now.toISOString(),
      status: 'gifted',
      claimAddress: defaultAddr,
    });

    res.json({
      message: `🎉 恭喜！${plant?.name || '花卉'}已免费赠送！即将寄送到你的收货地址`,
      claim: {
        plantName: plant?.name,
        claimedAt: now,
        address: defaultAddr,
      },
    });
  } catch (err) {
    console.error('Claim error:', err);
    res.status(500).json({ error: '领取失败' });
  }
});

// ===== 辅助函数 =====
function getStage(days, total) {
  const ratio = days / total;
  if (ratio < 0.1) return { name: '种子', emoji: '🟤', level: 1 };
  if (ratio < 0.25) return { name: '发芽', emoji: '🌱', level: 2 };
  if (ratio < 0.5) return { name: '幼苗', emoji: '🌿', level: 3 };
  if (ratio < 0.75) return { name: '生长', emoji: '🪴', level: 4 };
  if (ratio < 1) return { name: '含苞', emoji: '🌺', level: 5 };
  return { name: '盛开', emoji: '🌻', level: 6 };
}

function canWaterToday(lastWateredAt) {
  if (!lastWateredAt) return true;
  const today = new Date().toDateString();
  const lastDay = new Date(lastWateredAt).toDateString();
  return today !== lastDay;
}

module.exports = router;
