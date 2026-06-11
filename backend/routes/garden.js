const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const GardenPlot = require('../models/GardenPlot');
const Plant = require('../models/Plant');

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
    const plants = await Plant.find({ isActive: true }).sort({ growDays: 1 }).lean();
    res.json({ plants });
  } catch (err) {
    res.status(500).json({ error: '获取花卉列表失败' });
  }
});

// ===== 获取我的花园 =====
router.get('/my-garden', authMiddleware, async (req, res) => {
  try {
    const plots = await GardenPlot.find({ userId: req.userId })
      .populate('plantId')
      .sort({ plantedAt: -1 })
      .lean();

    const now = new Date();
    const result = plots.map(plot => {
      const daysPassed = Math.floor((now - new Date(plot.plantedAt)) / (1000 * 60 * 60 * 24));
      const totalDays = plot.plantId?.growDays || 100;
      const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
      const isMature = daysPassed >= totalDays;
      const stage = getStage(daysPassed, totalDays);

      return {
        id: plot._id,
        plant: plot.plantId,
        plantedAt: plot.plantedAt,
        daysPassed,
        totalDays,
        progress,
        isMature,
        stage,
        waterCount: plot.waterCount,
        lastWateredAt: plot.lastWateredAt,
        canWater: canWaterToday(plot.lastWateredAt),
        claimedAt: plot.claimedAt,
      };
    });

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

    const plant = await Plant.findById(plantId);
    if (!plant) return res.status(404).json({ error: '花卉不存在' });

    // 检查是否已经种了这个花（同种花只能种一棵）
    const existing = await GardenPlot.findOne({ userId: req.userId, plantId, claimedAt: { $exists: false } });
    if (existing) return res.status(400).json({ error: `你已经种了一棵${plant.name}，请先照料完成` });

    const plot = await GardenPlot.create({
      userId: req.userId,
      plantId,
      plantedAt: new Date(),
      waterCount: 0,
    });

    res.json({ 
      message: `🌱 成功种下${plant.name}！`,
      plot: {
        id: plot._id,
        plantId,
        plantedAt: plot.plantedAt,
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
    const plot = await GardenPlot.findById(req.params.plotId);
    if (!plot) return res.status(404).json({ error: '花圃不存在' });
    if (plot.userId.toString() !== req.userId) return res.status(403).json({ error: '不是你的花' });

    if (!canWaterToday(plot.lastWateredAt)) {
      return res.status(400).json({ error: '今天已经浇过水了，明天再来吧！' });
    }

    const now = new Date();
    plot.waterCount += 1;
    plot.lastWateredAt = now;
    await plot.save();

    const daysPassed = Math.floor((now - new Date(plot.plantedAt)) / (1000 * 60 * 60 * 24));
    const plant = await Plant.findById(plot.plantId);
    const totalDays = plant?.growDays || 100;
    const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

    // 浇水加速：每次浇水减少 0.5 天（在计算进度时体现）
    const bonusDays = plot.waterCount * 0.5;
    const adjustedProgress = Math.min(100, Math.round(((daysPassed + bonusDays) / totalDays) * 100));

    res.json({
      message: '💧 浇水成功！花开得更美了',
      waterCount: plot.waterCount,
      progress: adjustedProgress,
      bonusDays,
    });
  } catch (err) {
    res.status(500).json({ error: '浇水失败' });
  }
});

// ===== 领取成熟花卉（免费赠送） =====
router.post('/claim/:plotId', authMiddleware, async (req, res) => {
  try {
    const plot = await GardenPlot.findById(req.params.plotId);
    if (!plot) return res.status(404).json({ error: '花圃不存在' });
    if (plot.userId.toString() !== req.userId) return res.status(403).json({ error: '不是你的花' });
    if (plot.claimedAt) return res.status(400).json({ error: '已经领取过了' });

    const now = new Date();
    const daysPassed = Math.floor((now - new Date(plot.plantedAt)) / (1000 * 60 * 60 * 24));
    const bonusDays = plot.waterCount * 0.5;
    const plant = await Plant.findById(plot.plantId);
    const totalDays = plant?.growDays || 100;

    if (daysPassed + bonusDays < totalDays) {
      const remaining = Math.ceil(totalDays - daysPassed - bonusDays);
      return res.status(400).json({ error: `还没成熟哦，还需 ${remaining} 天` });
    }

    // 检查收货地址
    const User = mongoose.model('User');
    const user = await User.findById(req.userId);
    const defaultAddr = user?.address?.find(a => a.isDefault) || user?.address?.[0];
    if (!defaultAddr) {
      return res.status(400).json({ error: '请先设置收货地址' });
    }

    plot.claimedAt = now;
    plot.claimAddress = defaultAddr;
    await plot.save();

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
