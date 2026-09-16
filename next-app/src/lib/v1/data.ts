/**
 * V1 设计稿（北京鲜花实时交易平台）共享数据
 * - 行情价/涨跌 模拟北京丰台花卉交易中心当日数据
 * - 商品/花店 优先从 /api/products 实时拉,失败回退 mock
 */

export type MarketFlower = {
  name: string;
  grade: 'A' | 'B';
  marketPrice: number;
  platformPrice: number;
  change: number;
  updatedAt: string;
  emoji: string;
};

export const MARKET_FLOWERS: MarketFlower[] = [
  { name: '玫瑰',   grade: 'A', marketPrice: 3.20, platformPrice: 4.80,  change: -12, updatedAt: '14:32', emoji: '🌹' },
  { name: '玫瑰',   grade: 'B', marketPrice: 2.60, platformPrice: 3.90,  change: -10, updatedAt: '14:32', emoji: '🌹' },
  { name: '康乃馨', grade: 'A', marketPrice: 1.60, platformPrice: 2.30,  change: -5,  updatedAt: '14:28', emoji: '🌷' },
  { name: '向日葵', grade: 'A', marketPrice: 2.10, platformPrice: 3.20,  change: -8,  updatedAt: '14:25', emoji: '🌻' },
  { name: '绣球',   grade: 'A', marketPrice: 7.20, platformPrice: 10.50, change: 3,   updatedAt: '14:20', emoji: '💠' },
  { name: '百合',   grade: 'A', marketPrice: 4.50, platformPrice: 6.80,  change: 0,   updatedAt: '14:18', emoji: '🌸' },
];

export const TODAY_DEAL_PRODUCTS = [
  { id: 'p1', name: '向日葵花束', emoji: '🌻', price: 69,  marketPrice: 75,  change: -8,  tag: '生日祝福' },
  { id: 'p2', name: '红玫瑰花束', emoji: '🌹', price: 99,  marketPrice: 113, change: -12, tag: '表白首选' },
  { id: 'p3', name: '康乃馨花束', emoji: '🌷', price: 59,  marketPrice: 62,  change: -5,  tag: '感恩母亲' },
];

export const TREND_ROSE_7D = [
  { date: '4/10', value: 4.20 },
  { date: '4/11', value: 4.05 },
  { date: '4/12', value: 3.90 },
  { date: '4/13', value: 3.70 },
  { date: '4/14', value: 3.50 },
  { date: '4/15', value: 3.30 },
  { date: '4/16', value: 3.20 },
];

export const TREND_SUN_7D = [
  { date: '4/10', value: 2.40 },
  { date: '4/11', value: 2.35 },
  { date: '4/12', value: 2.30 },
  { date: '4/13', value: 2.20 },
  { date: '4/14', value: 2.15 },
  { date: '4/15', value: 2.10 },
  { date: '4/16', value: 2.10 },
];

export const HOT_FLOWERS = [
  { name: '玫瑰',   emoji: '🌹', change: -12 },
  { name: '向日葵', emoji: '🌻', change: -8  },
  { name: '康乃馨', emoji: '🌷', change: -5  },
  { name: '绣球',   emoji: '💠', change: 3   },
];

export const DELIVERY_AREAS = [
  '朝阳', '海淀', '丰台', '东城', '西城',
  '大兴', '通州', '昌平', '顺义', '更多',
];

export const AI_PICKS = [
  { id: 'p4', name: '向日葵', emoji: '🌻', price: 2.6, prevPrice: 2.83, change: -8,  reason: '当季鲜花,花期长' },
  { id: 'p5', name: '红玫瑰', emoji: '🌹', price: 3.8, prevPrice: 4.32, change: -12, reason: '供应充足,价格回落' },
  { id: 'p6', name: '康乃馨', emoji: '🌷', price: 1.9, prevPrice: 2.00, change: -5,  reason: '性价比高' },
];

export const QUICK_SELECT = {
  recipient: ['女朋友', '妈妈', '姐姐', '朋友', '客户', '生日', '表白'],
  budget:    ['¥100', '¥200', '¥300', '¥500+'],
  scene:     ['生日', '纪念日', '求婚', '升迁', '其他'],
  area:      ['朝阳区', '海淀区', '丰台区', '西城区', '东城区', '其他'],
  deliveryTime: ['今天', '30分钟内', '1小时内', '指定时间'],
};

export const AI_PLANS = [
  {
    id: 'plan1',
    name: '19枝香槟玫瑰',
    emoji: '🌹',
    tag: '推荐',
    scene: '生日 · 浪漫',
    price: 198,
    marketPrice: 225,
    change: -12,
    delivery: '朝阳区附近花店发货',
    eta: '预计 45分钟送达',
    stock: '库存充足',
    reasons: ['精选香槟玫瑰 19 枝,经典生日款', '花束大小适中,适合客厅摆放', '北京当日现货,45分钟内送达'],
  },
  {
    id: 'plan2',
    name: '21枝红玫瑰',
    emoji: '🌹',
    tag: '',
    scene: '生日 · 浓情',
    price: 268,
    marketPrice: 298,
    change: -12,
    delivery: '朝阳区附近花店发货',
    eta: '预计 50分钟送达',
    stock: '库存充足',
    reasons: ['21 枝红玫瑰,浓情蜜意', '加金色缎带,仪式感更强', '可加贺卡 + 礼盒升级'],
  },
  {
    id: 'plan3',
    name: '混搭花束',
    emoji: '💐',
    tag: '',
    scene: '生日 · 清新',
    price: 158,
    marketPrice: 178,
    change: -11,
    delivery: '朝阳区附近花店发货',
    eta: '预计 60分钟送达',
    stock: '库存充足',
    reasons: ['玫瑰 + 满天星 + 桔梗 混搭', '色彩清新,适合年轻女生', '性价比之选'],
  },
];

export const PURCHASE_STEPS = [
  { idx: 1, title: '查看行情',     desc: '挑选心仪的花材品类' },
  { idx: 2, title: '进入商品详情', desc: '确认规格 / 数量 / 花店' },
  { idx: 3, title: '加入购物车',   desc: '支持多花材合并下单' },
  { idx: 4, title: '下单支付',     desc: '多种支付方式,安全快捷' },
];

export const PRODUCT_DETAIL = {
  id: '19-champagne-rose',
  name: '19枝香槟玫瑰',
  scene: '生日 / 求爱推荐',
  desc: '温柔的爱，优雅的表达了',
  price: 198,
  marketPrice: 225,
  change: -12,
  updatedAt: '14:32',
  market: '北京花卉交易中心',
  grades: [
    { label: 'A级 (推荐)', value: 'A' },
    { label: 'B级',        value: 'B' },
    { label: 'C级',        value: 'C' },
  ],
  sizes: [
    { label: '19枝 (约50cm)', value: '19' },
    { label: '11枝 (约40cm)', value: '11' },
    { label: '33枝 (约60cm)', value: '33' },
  ],
  origins: ['昆昆拿多', '昆明', '其他'],
  shop: { name: '北京区花卉', distance: '朝阳区 2.3km' },
  delivery: { eta: 45, window: '18:00 - 19:00' },
  stock: 12,
  why: '今天北京市场玫瑰供应增加，市场价格较昨日下降12%，平台同步调整售价，让利给用户。',
  breadcrumb: ['首页', '鲜花', '玫瑰', '19枝香槟玫瑰'],
  galleryEmojis: ['🌹', '🌷', '🌸', '💐', '🌺'],
  sameStyle: [
    { id: 's1', name: '11枝香槟玫瑰', emoji: '🌹', price: 128 },
    { id: 's2', name: '33枝香槟玫瑰', emoji: '🌹', price: 298 },
    { id: 's3', name: '混搭花束',     emoji: '💐', price: 198 },
  ],
  aiAlsoLike: [
    { id: 'a1', name: '11枝红玫瑰', emoji: '🌹', price: 168, marketPrice: 198, change: -15 },
    { id: 'a2', name: '向日葵花束', emoji: '🌻', price: 99,  marketPrice: 118, change: -16 },
    { id: 'a3', name: '蓝色花束',   emoji: '💙', price: 158, marketPrice: 179, change: -12 },
  ],
};

export const AI_INSIGHT = {
  title: '为什么今天价格下跌?',
  summary: '今天玫瑰价格比昨天下跌了12%。主要原因:',
  reasons: [
    '北京市场玫瑰供应量增加，市场竞争加剧',
    '近期天气转好，促花品质提升，花价有所下降',
    '平台同步调整零售价，让利给用户',
  ],
  marketNews: [
    { label: '玫瑰供应增加',     detail: '稳定回落' },
    { label: '价格预计短期内', detail: '保持平稳' },
  ],
};

export function getMarketInsight(flower: string, change: number): string {
  if (change < 0) {
    return `今天${flower}价格比昨天下跌了${Math.abs(change)}%。北京市场供应增加，平台同步调整零售价，让利给用户。`;
  }
  if (change > 0) {
    return `今天${flower}价格比昨天上涨了${change}%。节日效应叠加供应紧张，预计短期内仍将保持高位。`;
  }
  return `今天${flower}价格与昨天持平。市场供需平衡，价格稳定。`;
}
