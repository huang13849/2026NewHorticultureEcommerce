/**
 * 初始化种花数据
 * 向 MongoDB 插入植物配置和成长阶段
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('FATAL: MONGO_URI env not set'); process.exit(2); }

const PlantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scientificName: String,
  emoji: { type: String, default: '🌱' },
  description: String,
  growDays: { type: Number, default: 100 },
  stages: [{
    day: Number,
    name: String,
    emoji: String,
    description: String,
  }],
  category: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  waterPerDay: { type: Number, default: 1 },
  rewardProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  rewardQuantity: { type: Number, default: 1 },
  image: String,
  isActive: { type: Boolean, default: true },
});

const Plant = mongoose.model('Plant', PlantSchema);

const SEED_PLANTS = [
  {
    name: '向日葵',
    scientificName: 'Helianthus annuus',
    emoji: '🌻',
    description: '向阳而生，寓意希望与忠诚。种满100天免费送到家！',
    growDays: 100,
    category: '观赏花卉',
    difficulty: 'easy',
    waterPerDay: 1,
    rewardQuantity: 1,
    stages: [
      { day: 0, name: '种子', emoji: '🫘', description: '刚播下的向日葵种子' },
      { day: 5, name: '发芽', emoji: '🌱', description: '嫩芽破土而出' },
      { day: 15, name: '幼苗', emoji: '🌿', description: '两片真叶展开' },
      { day: 30, name: '成长', emoji: '🪴', description: '茎秆拔节长高' },
      { day: 50, name: '花苞', emoji: '🌷', description: '花苞开始孕育' },
      { day: 70, name: '开花', emoji: '🌼', description: '花瓣初绽' },
      { day: 85, name: '盛放', emoji: '🌻', description: '向日葵完全盛开' },
      { day: 100, name: '成熟', emoji: '🎁', description: '成熟可以收获了！' },
    ],
    isActive: true,
  },
  {
    name: '玫瑰',
    scientificName: 'Rosa',
    emoji: '🌹',
    description: '爱情之花，浪漫的象征。细心呵护100天即可获赠！',
    growDays: 100,
    category: '观赏花卉',
    difficulty: 'medium',
    waterPerDay: 2,
    rewardQuantity: 3,
    stages: [
      { day: 0, name: '种子', emoji: '🫘', description: '玫瑰种子' },
      { day: 7, name: '发芽', emoji: '🌱', description: '嫩芽冒出' },
      { day: 20, name: '幼苗', emoji: '🌿', description: '枝叶开始生长' },
      { day: 35, name: '成长', emoji: '🪴', description: '枝条伸展' },
      { day: 55, name: '花苞', emoji: '🌷', description: '花苞初现' },
      { day: 75, name: '开花', emoji: '🌹', description: '玫瑰花盛开' },
      { day: 90, name: '盛放', emoji: '💐', description: '满枝花朵' },
      { day: 100, name: '成熟', emoji: '🎁', description: '可以收获了！' },
    ],
    isActive: true,
  },
  {
    name: '薰衣草',
    scientificName: 'Lavandula',
    emoji: '💜',
    description: '浪漫紫海，安神助眠。耐心种植100天免费赠送到家！',
    growDays: 100,
    category: '香草植物',
    difficulty: 'medium',
    waterPerDay: 1,
    rewardQuantity: 1,
    stages: [
      { day: 0, name: '种子', emoji: '🫘', description: '薰衣草种子' },
      { day: 10, name: '发芽', emoji: '🌱', description: '缓慢发芽中' },
      { day: 25, name: '幼苗', emoji: '🌿', description: '灰绿色叶片' },
      { day: 45, name: '成长', emoji: '🪴', description: '株丛成型' },
      { day: 65, name: '花穗', emoji: '💜', description: '紫色花穗抽出' },
      { day: 85, name: '盛开', emoji: '💐', description: '紫色花海' },
      { day: 100, name: '成熟', emoji: '🎁', description: '可以收获了！' },
    ],
    isActive: true,
  },
  {
    name: '多肉',
    scientificName: 'Succulent',
    emoji: '🪴',
    description: '可爱治愈，懒人必备。简单浇水100天免费获赠！',
    growDays: 100,
    category: '多肉植物',
    difficulty: 'easy',
    waterPerDay: 1,
    rewardQuantity: 1,
    stages: [
      { day: 0, name: '叶插', emoji: '🫘', description: '叶片扦插' },
      { day: 10, name: '生根', emoji: '🌱', description: '小根长出' },
      { day: 25, name: '出芽', emoji: '🌿', description: '新芽冒出' },
      { day: 45, name: '成长', emoji: '🪴', description: '小苗成形' },
      { day: 70, name: '成形', emoji: '🌵', description: '株型饱满' },
      { day: 100, name: '成熟', emoji: '🎁', description: '可以收获了！' },
    ],
    isActive: true,
  },
  {
    name: '百合',
    scientificName: 'Lilium',
    emoji: '🤍',
    description: '纯洁高雅，百年好合。精心培育100天免费收花！',
    growDays: 100,
    category: '观赏花卉',
    difficulty: 'medium',
    waterPerDay: 1,
    rewardQuantity: 1,
    stages: [
      { day: 0, name: '种球', emoji: '🫘', description: '百合种球' },
      { day: 8, name: '发芽', emoji: '🌱', description: '种球萌发' },
      { day: 20, name: '幼苗', emoji: '🌿', description: '茎叶生长' },
      { day: 40, name: '成长', emoji: '🪴', description: '花茎拔高' },
      { day: 60, name: '花苞', emoji: '🌷', description: '花苞形成' },
      { day: 80, name: '开花', emoji: '🤍', description: '百合花盛开' },
      { day: 100, name: '成熟', emoji: '🎁', description: '可以收获了！' },
    ],
    isActive: true,
  },
];

async function seed() {
  console.log('🌸 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  // 检查是否已有数据
  const count = await Plant.countDocuments();
  if (count > 0) {
    console.log(`⏭️  Plants already exist (${count}), skipping seed`);
    process.exit(0);
  }

  // 插入种子数据
  const result = await Plant.insertMany(SEED_PLANTS);
  console.log(`✅ Seeded ${result.length} plants:`);
  result.forEach(p => console.log(`  ${p.emoji} ${p.name} (${p.growDays}天, ${p.difficulty})`));

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
