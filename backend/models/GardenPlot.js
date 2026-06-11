const mongoose = require('mongoose');

const GardenPlotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
  
  // 种植状态
  status: { 
    type: String, 
    enum: ['growing', 'mature', 'gifted', 'withered'], 
    default: 'growing' 
  },
  
  // 成长追踪
  plantedAt: { type: Date, default: Date.now },
  currentDay: { type: Number, default: 0 },
  currentStage: { type: String, default: 'seed' },
  
  // 互动记录
  waterCount: { type: Number, default: 0 },          // 浇水次数
  lastWaterAt: Date,                                  // 上次浇水时间
  sunshineCount: { type: Number, default: 0 },        // 阳光次数
  lastSunshineAt: Date,
  
  // 成熟/赠送
  maturedAt: Date,
  giftedAt: Date,
  giftAddress: {                                      // 赠送地址
    name: String,
    phone: String,
    province: String,
    city: String,
    district: String,
    detail: String,
  },
  giftOrderId: String,                                // 关联订单号
  
  // 每日打卡
  checkInDates: [{ type: String }],                   // ['2024-01-01', '2024-01-02', ...]
  
}, { timestamps: true });

// 索引
GardenPlotSchema.index({ userId: 1, status: 1 });
GardenPlotSchema.index({ userId: 1, plantedAt: -1 });

module.exports = mongoose.model('GardenPlot', GardenPlotSchema);
