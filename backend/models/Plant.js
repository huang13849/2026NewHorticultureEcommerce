const mongoose = require('mongoose');

const PlantSchema = new mongoose.Schema({
  name: { type: String, required: true },           // 植物名称：向日葵、玫瑰等
  scientificName: String,                            // 学名
  emoji: { type: String, default: '🌱' },           // emoji 图标
  description: String,                               // 描述
  growDays: { type: Number, default: 100 },          // 成长所需天数
  stages: [{                                         // 成长阶段
    day: Number,                                     // 第几天
    name: String,                                    // 阶段名：种子→发芽→成长→开花→成熟
    emoji: String,                                   // 阶段图标
    description: String,
  }],
  category: String,                                  // 分类
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  waterPerDay: { type: Number, default: 1 },         // 每天需浇水次数
  rewardProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // 成熟后赠送的商品
  rewardQuantity: { type: Number, default: 1 },      // 赠送数量
  image: String,                                     // 植物图片
  isActive: { type: Boolean, default: true },        // 是否可种植
});

module.exports = mongoose.model('Plant', PlantSchema);
