const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  nickname: { type: String, default: '' },
  avatar: { type: String, default: '' },
  
  // 位置信息
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  locationAddress: { type: String, default: '' },
  
  // 收货地址
  address: [{
    name: String,
    phone: String,
    province: String,
    city: String,
    district: String,
    detail: String,
    isDefault: { type: Boolean, default: false },
  }],
  
  // 设备/Session 信息
  deviceInfo: {
    platform: String,     // ios / android / web / miniprogram
    deviceId: String,
    sessionId: String,
    routerInfo: String,   // 路由器相关信息
    appVersion: String,
    lastIp: String,
  },
  
  // 用户偏好
  preferences: {
    categories: [String],
    priceRange: { min: Number, max: Number },
    favoriteSuppliers: [mongoose.Schema.Types.ObjectId],
  },
  
  // 种花统计
  gardenStats: {
    totalPlanted: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalGifted: { type: Number, default: 0 },
  },
  
  lastLoginAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
