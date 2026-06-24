const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3011;
const SITE_URL = process.env.SITE_URL || 'https://horiculture.space';
const SITE_URLS = (process.env.SITE_URLS || `${SITE_URL},http://106.12.91.182,https://2026newhorticultureecommerce.pages.dev`).split(',').map(s => s.trim()).filter(Boolean);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';
const CF_ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || 'horiculture.space';
const LOG_FILE = path.join(DATA_DIR, 'pageviews.jsonl');
const TREND_FILE = path.join(DATA_DIR, 'horticulture-trends.json');
fs.mkdirSync(DATA_DIR, { recursive: true });



const TREND_SEED = {
  "updatedAt": "2026-06-24T15:44:13.813Z",
  "nextUpdateHint": "每日建议北京时间 08:30 刷新：国内看百度/小红书/抖音/微信生态，国外看 Google/Bing/Pinterest/TikTok 与园艺媒体；本次已扩展为国内 20 + 国外 20 个趋势词。",
  "domestic": [
    {
      "keyword": "阳台花园",
      "score": 99,
      "momentum": "high",
      "source": "百度/小红书/抖音生活方式",
      "audience": "城市阳台、租房改造、新手养花",
      "summary": "小空间立体种植、栏杆花箱和治愈系阳台改造持续热门。",
      "adTitle": "把 3㎡ 阳台种成一座小花园",
      "adCopy": "按朝向、光照和预算推荐月季、绣球、香草与花架组合。",
      "visualPrompt": "北京公寓阳台，木质花架，月季绣球薄荷小番茄，清晨阳光，治愈生活方式广告",
      "cta": "生成阳台花园方案",
      "route": "/shop?keyword=阳台花园",
      "tags": [
        "小空间",
        "垂直绿化",
        "治愈生活"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "智能花盆",
      "score": 96,
      "momentum": "high",
      "source": "电商搜索/智能家居/懒人养花",
      "audience": "出差人群、智能家居用户、养花新手",
      "summary": "自动浇水、湿度监测和手机提醒把“养不活”变成核心卖点。",
      "adTitle": "出差 7 天，绿植也能自己喝水",
      "adCopy": "智能灌溉 + 新手绿植套餐，让养花从玄学变成数据。",
      "visualPrompt": "现代客厅窗边智能自浇水花盆，绿萝龟背竹，手机湿度曲线界面，科技感绿色家居广告",
      "cta": "查看智能养护组合",
      "route": "/shop?keyword=智能花盆",
      "tags": [
        "自动浇水",
        "懒人养花",
        "智能家居"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "蝴蝶兰",
      "score": 94,
      "momentum": "high",
      "source": "小红书/电商/节庆礼品",
      "audience": "礼品花、办公室、乔迁送礼",
      "summary": "长花期、高级感和礼品属性强，仍是室内盆花顶流。",
      "adTitle": "一盆能开两三个月的高级感",
      "adCopy": "精选蝴蝶兰礼盒，到家即赏，适合新居、办公室和节日送礼。",
      "visualPrompt": "高级东方客厅，白色紫色蝴蝶兰盆栽，陶瓷花器，柔和自然光，礼品级花卉广告",
      "cta": "挑选蝴蝶兰",
      "route": "/shop?keyword=蝴蝶兰",
      "tags": [
        "送礼",
        "长花期",
        "室内盆花"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "耐热耐晒花卉",
      "score": 93,
      "momentum": "high",
      "source": "百度/抖音/夏季养花",
      "audience": "南向阳台、庭院、夏季养花用户",
      "summary": "高温天气带动蓝雪花、三角梅、太阳花、飘香藤等耐热品种搜索。",
      "adTitle": "盛夏也开爆的耐晒花",
      "adCopy": "为南向阳台和露台匹配耐热耐晒组合，少操心也有花看。",
      "visualPrompt": "夏日南向阳台，蓝雪花三角梅太阳花飘香藤盛开，强光下清爽高饱和广告图",
      "cta": "查看耐热花卉清单",
      "route": "/shop?keyword=耐热耐晒花卉",
      "tags": [
        "夏季爆花",
        "南阳台",
        "低维护"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "新中式庭院",
      "score": 92,
      "momentum": "high",
      "source": "小红书/家装/庭院设计",
      "audience": "别墅庭院、民宿、茶空间",
      "summary": "中式景观、禅意庭院、盆景与月季绣球组合适合高客单价内容。",
      "adTitle": "把院子做成会呼吸的新中式花境",
      "adCopy": "松、竹、绣球、月季和苔石组合，适配民宿、茶室和私家庭院。",
      "visualPrompt": "新中式庭院，青石汀步，绣球月季竹影盆景，雨后微光，高端庭院设计广告",
      "cta": "定制庭院花境",
      "route": "/shop?keyword=新中式庭院",
      "tags": [
        "庭院设计",
        "花境",
        "高端审美"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "家庭可食花园",
      "score": 91,
      "momentum": "medium",
      "source": "百度/小红书/亲子生活",
      "audience": "亲子家庭、阳台种菜、轻健康人群",
      "summary": "薄荷、罗勒、小番茄、可食花等“可看可吃”植物适合种草。",
      "adTitle": "今天的沙拉，长在你家阳台上",
      "adCopy": "香草、番茄和可食花卉组合，让孩子每天看见植物生长。",
      "visualPrompt": "亲子在阳台采摘小番茄和罗勒，旁边有可食花卉和种植箱，温暖家庭广告",
      "cta": "开始种一桌春天",
      "route": "/shop?keyword=香草 番茄",
      "tags": [
        "亲子",
        "可食用",
        "阳台种菜"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "室内大叶绿植",
      "score": 90,
      "momentum": "medium",
      "source": "小红书/家居软装/办公室绿植",
      "audience": "装修用户、办公室、软装搭配",
      "summary": "龟背竹、天堂鸟、琴叶榕等大叶绿植继续承担低成本软装升级角色。",
      "adTitle": "一盆大叶绿植，立刻让家有呼吸感",
      "adCopy": "按客厅光照和空间尺寸推荐大叶绿植，让软装更自然。",
      "visualPrompt": "现代客厅，龟背竹天堂鸟琴叶榕，奶油风沙发，自然光，家居软装广告",
      "cta": "挑一盆客厅主角",
      "route": "/shop?keyword=大叶绿植",
      "tags": [
        "软装",
        "室内绿植",
        "空气感"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "绣球花",
      "score": 89,
      "momentum": "medium",
      "source": "小红书/庭院花园/节日花束",
      "audience": "阳台党、庭院用户、切花爱好者",
      "summary": "绣球因花球体量大、拍照出片和色彩变化，仍适合首页视觉素材。",
      "adTitle": "一朵绣球，撑起整个夏天的浪漫",
      "adCopy": "从无尽夏到圆锥绣球，帮你匹配盆栽、庭院和切花场景。",
      "visualPrompt": "蓝紫粉绣球花海，阳台和庭院混合场景，柔和散景，浪漫花卉广告",
      "cta": "查看绣球花苗",
      "route": "/shop?keyword=绣球",
      "tags": [
        "夏季花园",
        "拍照出片",
        "花球"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "月季花墙",
      "score": 88,
      "momentum": "medium",
      "source": "抖音/小红书/庭院内容",
      "audience": "庭院、露台、花墙改造用户",
      "summary": "藤本月季、拱门和花墙是强视觉内容，适合带动苗木与资材组合购买。",
      "adTitle": "把一面墙变成玫瑰瀑布",
      "adCopy": "藤本月季 + 拱门 + 牵引方案，让庭院在春夏开成花海。",
      "visualPrompt": "庭院月季花墙，粉色藤本月季爬满拱门，晨光，浪漫家园广告",
      "cta": "打造月季花墙",
      "route": "/shop?keyword=月季花墙",
      "tags": [
        "藤本月季",
        "花墙",
        "庭院爆款"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "多肉组合盆栽",
      "score": 87,
      "momentum": "medium",
      "source": "电商/礼品/办公室桌面",
      "audience": "办公室、学生、礼品用户",
      "summary": "低维护、造型强和价格带灵活，适合桌面礼物和组合销售。",
      "adTitle": "桌上一小盆，心情有绿洲",
      "adCopy": "多肉组合盆栽，少水低维护，适合办公室和新手礼物。",
      "visualPrompt": "办公桌多肉组合盆栽，陶瓷小花器，文具电脑，明亮干净广告图",
      "cta": "选多肉组合",
      "route": "/shop?keyword=多肉组合盆栽",
      "tags": [
        "桌面绿植",
        "礼品",
        "低维护"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "空气凤梨",
      "score": 86,
      "momentum": "medium",
      "source": "小红书/创意家居/轻养护",
      "audience": "租房、桌面装饰、创意礼品",
      "summary": "无土栽培、可悬挂、轻量装饰，适合年轻用户和短视频展示。",
      "adTitle": "不用土也能养的空气感植物",
      "adCopy": "空气凤梨搭配玻璃球、木架和微景观，轻松点亮桌面。",
      "visualPrompt": "空气凤梨悬挂在玻璃球和木质支架上，极简桌面，年轻创意家居广告",
      "cta": "探索空气凤梨",
      "route": "/shop?keyword=空气凤梨",
      "tags": [
        "无土栽培",
        "创意装饰",
        "轻养护"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "苔藓微景观",
      "score": 85,
      "momentum": "medium",
      "source": "手作内容/亲子/礼品",
      "audience": "手作爱好者、亲子家庭、办公室桌面",
      "summary": "微缩景观、雨林瓶和治愈系桌面内容容易产生分享。",
      "adTitle": "把一片小森林放进玻璃瓶",
      "adCopy": "苔藓、蕨类和微缩摆件组合，适合亲子手作与桌面疗愈。",
      "visualPrompt": "玻璃瓶苔藓微景观，小蕨类，小石径，微缩森林，温柔灯光广告",
      "cta": "制作微景观",
      "route": "/shop?keyword=苔藓微景观",
      "tags": [
        "手作",
        "亲子",
        "桌面疗愈"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "水培绿植",
      "score": 84,
      "momentum": "medium",
      "source": "电商搜索/办公室/新手养花",
      "audience": "办公室、新手、干净家居用户",
      "summary": "干净、可见根系、维护简单，适合绿萝、富贵竹、白掌等组合销售。",
      "adTitle": "看得见根系的干净绿意",
      "adCopy": "水培绿植无需复杂土壤，适合办公室、餐桌和新手入门。",
      "visualPrompt": "透明玻璃瓶水培绿萝白掌富贵竹，干净桌面，自然光，清新广告",
      "cta": "购买水培组合",
      "route": "/shop?keyword=水培绿植",
      "tags": [
        "干净",
        "办公室",
        "新手友好"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "驱蚊香草植物",
      "score": 83,
      "momentum": "medium",
      "source": "夏季生活/家庭阳台/宠物友好",
      "audience": "有娃家庭、宠物家庭、露台用户",
      "summary": "薄荷、迷迭香、碰碰香等植物兼具香味、食用和场景卖点。",
      "adTitle": "阳台有香气，夏天更好待",
      "adCopy": "迷迭香、薄荷、碰碰香等香草组合，适合厨房窗台和露台。",
      "visualPrompt": "夏季阳台香草植物，薄荷迷迭香碰碰香，柠檬水和藤椅，生活方式广告",
      "cta": "选香草组合",
      "route": "/shop?keyword=驱蚊香草",
      "tags": [
        "夏季",
        "香草",
        "家庭阳台"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "垂吊植物",
      "score": 82,
      "momentum": "medium",
      "source": "家居软装/小空间绿化",
      "audience": "租房、公寓、咖啡馆、办公室",
      "summary": "吊兰、爱之蔓、常春藤、绿萝适合小户型垂直绿化。",
      "adTitle": "不占地，也能拥有一片绿瀑布",
      "adCopy": "垂吊植物让墙角、窗边和书架立刻变成自然空间。",
      "visualPrompt": "窗边垂吊植物绿瀑布，爱之蔓常春藤绿萝，日系家居广告",
      "cta": "挑选垂吊植物",
      "route": "/shop?keyword=垂吊植物",
      "tags": [
        "垂直空间",
        "小户型",
        "软装"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "花境植物",
      "score": 81,
      "momentum": "medium",
      "source": "庭院设计/市政景观/民宿",
      "audience": "园林工程、民宿、庭院用户",
      "summary": "多年生花境、低维护混植和四季景观适合 B 端方案销售。",
      "adTitle": "一年四季都有层次的花境方案",
      "adCopy": "按季相搭配宿根花卉、观赏草和灌木，降低养护成本。",
      "visualPrompt": "四季花境，宿根花卉观赏草灌木层次，民宿庭院景观广告",
      "cta": "获取花境配置",
      "route": "/shop?keyword=花境植物",
      "tags": [
        "宿根花卉",
        "景观工程",
        "低维护"
      ],
      "sources": [
        "https://www.chinahhxh.com/hhxh/detail.html?contentId=1561&id=46"
      ]
    },
    {
      "keyword": "花卉供应链",
      "score": 80,
      "momentum": "medium",
      "source": "行业协会/采购搜索/B端询盘",
      "audience": "花店、工程采购、批发商、供应商",
      "summary": "产地直连、拍卖价格、冷链和溯源成为 B 端决策关键词。",
      "adTitle": "从产地到花店，少一层就多一分新鲜",
      "adCopy": "连接云南、青州、漳州等产区，采购、拍卖、地图找货一次完成。",
      "visualPrompt": "中国花卉供应链地图，云南玫瑰青州盆花冷链物流车电子拍卖屏，科技农业广告",
      "cta": "进入花卉供应链",
      "route": "/auction",
      "tags": [
        "产地直采",
        "冷链",
        "批发拍卖"
      ],
      "sources": [
        "https://www.chinahhxh.com/hhxh/detail.html?contentId=1561&id=46"
      ]
    },
    {
      "keyword": "低维护花园",
      "score": 79,
      "momentum": "medium",
      "source": "庭院设计/懒人养护/节水趋势",
      "audience": "忙碌家庭、民宿、商业空间",
      "summary": "少浇水、少修剪、耐热耐寒的植物组合更容易成交。",
      "adTitle": "好看的花园，也可以很省心",
      "adCopy": "用耐旱宿根、观赏草和自动灌溉，打造低维护景观。",
      "visualPrompt": "低维护现代花园，观赏草耐旱花卉滴灌系统，简洁高级广告",
      "cta": "配置低维护花园",
      "route": "/shop?keyword=低维护花园",
      "tags": [
        "省心",
        "节水",
        "庭院"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    },
    {
      "keyword": "植物疗愈",
      "score": 78,
      "momentum": "medium",
      "source": "心理健康/生活方式/办公室绿植",
      "audience": "高压职场、康养空间、学校社区",
      "summary": "园艺疗法、情绪价值和疗愈空间成为内容营销高频表达。",
      "adTitle": "把压力交给一盆会生长的绿意",
      "adCopy": "为办公桌、卧室和康养空间选择低负担疗愈植物。",
      "visualPrompt": "安静书桌旁绿色植物，柔和阳光，茶杯，慢生活疗愈广告",
      "cta": "挑选疗愈绿植",
      "route": "/shop?keyword=植物疗愈",
      "tags": [
        "情绪价值",
        "康养",
        "慢生活"
      ],
      "sources": [
        "https://zh.accio.com/business/%E6%9C%80%E8%BF%91%E6%B5%81%E8%A1%8C%E5%85%BB%E8%8A%B1"
      ]
    },
    {
      "keyword": "花园露营",
      "score": 77,
      "momentum": "low",
      "source": "露营/庭院生活/户外经济",
      "audience": "庭院用户、露营爱好者、民宿",
      "summary": "户外花园与露营、烧烤、夜间灯光结合，适合场景化销售。",
      "adTitle": "今晚就在花园里露营",
      "adCopy": "花卉、灯串、香草和户外盆栽，让庭院变成周末目的地。",
      "visualPrompt": "夜晚花园露营，灯串，户外盆栽，香草花卉，帐篷和餐桌，温暖广告",
      "cta": "布置花园露营",
      "route": "/shop?keyword=花园露营",
      "tags": [
        "户外生活",
        "民宿",
        "场景消费"
      ],
      "sources": [
        "https://zh.accio.com/business/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E6%B5%81%E8%A1%8C%E7%9A%84%E8%8A%B1"
      ]
    }
  ],
  "overseas": [
    {
      "keyword": "native plants",
      "score": 99,
      "momentum": "high",
      "source": "Google/Bing/PHS/eco gardening",
      "audience": "North American homeowners and pollinator gardeners",
      "summary": "Native and keystone plants are moving from niche to default for habitat-focused gardens.",
      "adTitle": "Build a Garden That Gives Back",
      "adCopy": "Native flowers, shrubs and keystone plants create habitat for bees, butterflies and birds.",
      "visualPrompt": "North American native plant meadow, milkweed, coneflower, goldenrod, butterflies, bees, premium sustainable garden hero image",
      "cta": "Explore native plant picks",
      "route": "/shop?keyword=native plants",
      "tags": [
        "biodiversity",
        "pollinators",
        "rewilding"
      ],
      "sources": [
        "https://phsonline.org/for-gardeners/gardeners-blog/top-gardening-trends-2026"
      ]
    },
    {
      "keyword": "drought tolerant plants",
      "score": 97,
      "momentum": "high",
      "source": "Google/Bing/climate gardening",
      "audience": "Hot-climate homeowners and low-maintenance garden buyers",
      "summary": "Heat waves and water restrictions keep water-wise plants at the center of garden planning.",
      "adTitle": "Less Water. More Bloom.",
      "adCopy": "Lavender, salvia, sedum and ornamental grasses make heat-ready gardens beautiful and low-care.",
      "visualPrompt": "Water-wise garden in golden hour, lavender salvia sedum ornamental grasses, dry climate modern landscape advertising hero",
      "cta": "Shop water-wise plants",
      "route": "/shop?keyword=drought tolerant plants",
      "tags": [
        "water-wise",
        "low maintenance",
        "climate-ready"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "pollinator plants",
      "score": 95,
      "momentum": "high",
      "source": "Google/Bing/native plant media",
      "audience": "Families, community gardens and wildlife gardeners",
      "summary": "Pollinator pathways, meadow borders and lawn replacement remain strong ecological search themes.",
      "adTitle": "Plant a Pathway for Butterflies",
      "adCopy": "Long-blooming pollinator plants connect your garden to a bigger ecological corridor.",
      "visualPrompt": "Pollinator pathway through neighborhood gardens, blooming native flowers, monarch butterflies, bees, hopeful eco campaign",
      "cta": "Start a pollinator bed",
      "route": "/shop?keyword=pollinator plants",
      "tags": [
        "butterflies",
        "bees",
        "meadow garden"
      ],
      "sources": [
        "https://phsonline.org/for-gardeners/gardeners-blog/top-gardening-trends-2026"
      ]
    },
    {
      "keyword": "living wall art",
      "score": 93,
      "momentum": "medium",
      "source": "Pinterest/Google/interior design media",
      "audience": "Apartment owners, offices and interior plant lovers",
      "summary": "Vertical houseplants and living walls solve small-space greening and perform well visually.",
      "adTitle": "Turn a Blank Wall Into a Living Jungle",
      "adCopy": "Vertical houseplants and climbing vines create a lush indoor statement without taking floor space.",
      "visualPrompt": "Modern apartment living wall art, pothos vines philodendron modular vertical planters, soft daylight, luxury interior plant ad",
      "cta": "Design a living wall",
      "route": "/shop?keyword=living wall",
      "tags": [
        "houseplants",
        "vertical garden",
        "interior design"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "robotic lawn mower",
      "score": 92,
      "momentum": "high",
      "source": "Google/Bing/smart garden trend radar",
      "audience": "Suburban homeowners and smart-home buyers",
      "summary": "Automated mowing and irrigation are growing as gardening shifts toward time-saving tools.",
      "adTitle": "Your Weekend Is Not for Mowing",
      "adCopy": "Automated garden tools keep lawns neat and irrigation precise while you enjoy the flowers.",
      "visualPrompt": "Robotic lawn mower on green lawn beside flower borders, smart irrigation droplets, sunny suburban garden tech advertisement",
      "cta": "See smart garden tools",
      "route": "/shop?keyword=robotic lawn mower",
      "tags": [
        "automation",
        "smart garden",
        "tools"
      ],
      "sources": [
        "https://www.risingtrends.co/trends/gardening-trends-2026"
      ]
    },
    {
      "keyword": "climate resilient garden",
      "score": 91,
      "momentum": "high",
      "source": "Garden media/sustainable landscaping",
      "audience": "Homeowners facing heat, storms and water restrictions",
      "summary": "Resilient planting plans combine shade, drought tolerance, stormwater and biodiversity.",
      "adTitle": "Design for the Weather You Actually Have",
      "adCopy": "Climate-ready plant palettes help gardens stay beautiful through heat, drought and heavy rain.",
      "visualPrompt": "Climate resilient garden with shade trees, rain garden, drought tolerant flowers, modern sustainable landscape advertising",
      "cta": "Build a resilient garden",
      "route": "/shop?keyword=climate resilient garden",
      "tags": [
        "climate-ready",
        "sustainability",
        "landscape"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "edible garden",
      "score": 90,
      "momentum": "medium",
      "source": "Google/Pinterest/homesteading content",
      "audience": "Families, renters and wellness-focused shoppers",
      "summary": "Herbs, berries, tomatoes and edible flowers turn gardens into lifestyle and food content.",
      "adTitle": "Grow Dinner Beside the Door",
      "adCopy": "Herbs, berries and edible flowers make small gardens beautiful, useful and delicious.",
      "visualPrompt": "Small patio edible garden, basil tomatoes strawberries edible flowers, family harvesting, bright lifestyle advertising",
      "cta": "Shop edible garden kits",
      "route": "/shop?keyword=edible garden",
      "tags": [
        "herbs",
        "food garden",
        "wellness"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "indoor plant wall",
      "score": 89,
      "momentum": "medium",
      "source": "Houseplant media/Pinterest/office design",
      "audience": "Apartment dwellers and workplace designers",
      "summary": "Indoor plant walls and shelf jungles remain a strong visual trend for houseplant SEO.",
      "adTitle": "A Green Wall Without the Renovation",
      "adCopy": "Modular shelves, trailing vines and easy-care foliage create an indoor jungle fast.",
      "visualPrompt": "Indoor plant shelf wall with pothos, philodendron, monstera, warm apartment daylight, social media houseplant ad",
      "cta": "Create an indoor plant wall",
      "route": "/shop?keyword=indoor plant wall",
      "tags": [
        "indoor jungle",
        "small space",
        "design"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "low maintenance garden",
      "score": 88,
      "momentum": "medium",
      "source": "Google/Bing/homeowner search",
      "audience": "Busy homeowners and rental property managers",
      "summary": "Search intent favors gardens that look polished without constant pruning, mowing or watering.",
      "adTitle": "A Garden That Looks After Itself",
      "adCopy": "Choose durable perennials, grasses and smart irrigation for a beautiful low-care landscape.",
      "visualPrompt": "Low maintenance modern garden, ornamental grasses, perennial flowers, drip irrigation, clean architecture advertising",
      "cta": "Plan a low-care garden",
      "route": "/shop?keyword=low maintenance garden",
      "tags": [
        "easy care",
        "perennials",
        "smart irrigation"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "no mow lawn",
      "score": 87,
      "momentum": "medium",
      "source": "Eco landscaping/lawn replacement content",
      "audience": "Eco-conscious homeowners and municipalities",
      "summary": "Clover lawns, meadow turf and lawn reduction connect sustainability with lower maintenance.",
      "adTitle": "Trade the Lawn for Life",
      "adCopy": "No-mow plantings reduce maintenance while feeding pollinators and softening the landscape.",
      "visualPrompt": "No mow lawn with clover, native flowers and stepping stones, butterflies, sustainable suburban yard ad",
      "cta": "Explore lawn alternatives",
      "route": "/shop?keyword=no mow lawn",
      "tags": [
        "lawn alternative",
        "clover",
        "pollinators"
      ],
      "sources": [
        "https://phsonline.org/for-gardeners/gardeners-blog/top-gardening-trends-2026"
      ]
    },
    {
      "keyword": "rain garden",
      "score": 86,
      "momentum": "medium",
      "source": "Stormwater/climate adaptation search",
      "audience": "Rainy-region homeowners, HOAs and cities",
      "summary": "Rain gardens tie flood control, native plants and landscape beauty into one clear use case.",
      "adTitle": "Make Rain Work for Your Garden",
      "adCopy": "Native wet-tolerant plants turn runoff into a beautiful, functional rain garden.",
      "visualPrompt": "Rain garden after light rain, native grasses iris and flowers, water droplets, sustainable landscape ad",
      "cta": "Design a rain garden",
      "route": "/shop?keyword=rain garden",
      "tags": [
        "stormwater",
        "native plants",
        "eco design"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "succulent arrangements",
      "score": 85,
      "momentum": "medium",
      "source": "Pinterest/Etsy/gift search",
      "audience": "Gift buyers, offices and small-space plant lovers",
      "summary": "Succulent bowls remain giftable, shippable and visually strong for marketplace traffic.",
      "adTitle": "A Desert Garden for the Desk",
      "adCopy": "Succulent arrangements deliver sculptural color with minimal water and care.",
      "visualPrompt": "Succulent bowl arrangement, echeveria sedum ceramic planter, bright desk, premium gift ad",
      "cta": "Shop succulent gifts",
      "route": "/shop?keyword=succulent arrangements",
      "tags": [
        "gifts",
        "desk plants",
        "low water"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "rare houseplants",
      "score": 84,
      "momentum": "medium",
      "source": "TikTok/Pinterest/collector communities",
      "audience": "Plant collectors and social media creators",
      "summary": "Variegated foliage and collectible aroids continue to drive high-intent niche searches.",
      "adTitle": "Find the Plant Nobody Else Has",
      "adCopy": "Curated rare houseplants bring collector energy to shelves, studios and plant rooms.",
      "visualPrompt": "Rare variegated houseplants, monstera albo, philodendron, collector shelf, moody premium ad",
      "cta": "Browse rare plants",
      "route": "/shop?keyword=rare houseplants",
      "tags": [
        "collectors",
        "variegated",
        "aroids"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "vertical vegetable garden",
      "score": 83,
      "momentum": "medium",
      "source": "Apartment gardening/urban homesteading",
      "audience": "Renters, balconies and small patios",
      "summary": "Vertical edible systems make food gardening feasible in tiny outdoor spaces.",
      "adTitle": "Grow Up, Not Out",
      "adCopy": "Stack herbs, greens and strawberries vertically for a productive balcony garden.",
      "visualPrompt": "Vertical vegetable garden on balcony, herbs lettuce strawberries, compact urban apartment, fresh lifestyle ad",
      "cta": "Start vertical growing",
      "route": "/shop?keyword=vertical vegetable garden",
      "tags": [
        "balcony",
        "edible",
        "space saving"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "smart irrigation",
      "score": 82,
      "momentum": "medium",
      "source": "Smart home/water conservation search",
      "audience": "Homeowners, landscapers and tech buyers",
      "summary": "Sensor-based watering aligns with drought concerns and automation trends.",
      "adTitle": "Water Only When Plants Need It",
      "adCopy": "Smart irrigation saves water and protects plants with schedules based on real conditions.",
      "visualPrompt": "Smart irrigation controller, drip lines in flower bed, phone app, water droplets, clean tech garden ad",
      "cta": "See smart watering",
      "route": "/shop?keyword=smart irrigation",
      "tags": [
        "automation",
        "water saving",
        "garden tech"
      ],
      "sources": [
        "https://www.risingtrends.co/trends/gardening-trends-2026"
      ]
    },
    {
      "keyword": "cut flower garden",
      "score": 81,
      "momentum": "medium",
      "source": "Pinterest/DIY/floral design",
      "audience": "Home gardeners, florists and event creators",
      "summary": "Homegrown bouquets, dahlias and zinnias convert well as aspirational garden content.",
      "adTitle": "Grow Bouquets in Your Backyard",
      "adCopy": "A cut flower garden gives you fresh stems for tables, gifts and everyday joy.",
      "visualPrompt": "Backyard cut flower garden, dahlias zinnias cosmos, basket of flowers, golden hour lifestyle ad",
      "cta": "Plant a cut flower bed",
      "route": "/shop?keyword=cut flower garden",
      "tags": [
        "bouquets",
        "dahlias",
        "DIY floral"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "sensory garden",
      "score": 80,
      "momentum": "medium",
      "source": "Wellness/school/community garden search",
      "audience": "Families, schools and care spaces",
      "summary": "Scent, texture, sound and accessible design make sensory gardens useful and emotionally clear.",
      "adTitle": "A Garden You Can Feel",
      "adCopy": "Fragrant herbs, soft grasses and tactile foliage create calming sensory spaces.",
      "visualPrompt": "Sensory garden with lavender lambs ear grasses wind chimes, inclusive pathway, calm wellness ad",
      "cta": "Create a sensory garden",
      "route": "/shop?keyword=sensory garden",
      "tags": [
        "wellness",
        "accessibility",
        "fragrance"
      ],
      "sources": [
        "https://www.gardenalchemist.ca/post/2026-sustainable-garden-trends"
      ]
    },
    {
      "keyword": "biophilic office plants",
      "score": 79,
      "momentum": "medium",
      "source": "Workplace design/wellness search",
      "audience": "Offices, studios and commercial interiors",
      "summary": "Biophilic design keeps demand for office plant subscriptions and large foliage installations strong.",
      "adTitle": "Bring Work Back to Life",
      "adCopy": "Office plants and green dividers improve mood, acoustics and visual comfort.",
      "visualPrompt": "Modern office with biophilic plants, green dividers, natural light, productive calm workplace ad",
      "cta": "Plan office greenery",
      "route": "/shop?keyword=office plants",
      "tags": [
        "biophilic design",
        "workplace",
        "wellness"
      ],
      "sources": [
        "https://www.homesandgardens.com/gardens/houseplants-trends-2026"
      ]
    },
    {
      "keyword": "wildflower meadow",
      "score": 78,
      "momentum": "medium",
      "source": "Landscape design/ecology/Pinterest",
      "audience": "Large-lot homeowners, communities and eco gardeners",
      "summary": "Meadow-style planting offers biodiversity, seasonal movement and lower mowing needs.",
      "adTitle": "Let the Lawn Become a Meadow",
      "adCopy": "Wildflowers and grasses create seasonal color while supporting wildlife.",
      "visualPrompt": "Wildflower meadow garden, native grasses, colorful blooms, butterflies, sunset, poetic eco ad",
      "cta": "Seed a meadow garden",
      "route": "/shop?keyword=wildflower meadow",
      "tags": [
        "meadow",
        "biodiversity",
        "low mow"
      ],
      "sources": [
        "https://phsonline.org/for-gardeners/gardeners-blog/top-gardening-trends-2026"
      ]
    },
    {
      "keyword": "garden lighting",
      "score": 77,
      "momentum": "low",
      "source": "Outdoor living/Pinterest/home improvement",
      "audience": "Patio owners, restaurants and garden event spaces",
      "summary": "Lighting extends garden use into evening and pairs naturally with patio plants and outdoor living.",
      "adTitle": "Make the Garden Glow After Sunset",
      "adCopy": "Warm lighting, planters and fragrant blooms turn patios into evening rooms.",
      "visualPrompt": "Evening patio garden with warm string lights, planters, flowers, outdoor dining, cozy premium ad",
      "cta": "Design night garden mood",
      "route": "/shop?keyword=garden lighting",
      "tags": [
        "outdoor living",
        "patio",
        "ambience"
      ],
      "sources": [
        "https://www.risingtrends.co/trends/gardening-trends-2026"
      ]
    }
  ]
};
function loadTrends() { try { if (fs.existsSync(TREND_FILE)) return JSON.parse(fs.readFileSync(TREND_FILE, 'utf8')); } catch {} return TREND_SEED; }
function trendsPayload() { const data = loadTrends(); const domestic = Array.isArray(data.domestic) ? data.domestic : TREND_SEED.domestic; const overseas = Array.isArray(data.overseas) ? data.overseas : TREND_SEED.overseas; return { ...data, updatedAt: data.updatedAt || new Date().toISOString(), domestic, overseas, allKeywords: [...domestic, ...overseas].map(x => x.keyword) }; }

const KEYWORDS = ['植物猎人','Plant Hunter','植物猎人 花卉','植物猎人 Plant Hunter','花卉供应链','花卉供应链平台','园艺电商','苗木批发拍卖','flower supply chain','plant hunter horticulture','smart flower supply chain','horticulture ecommerce','garden plant marketplace','map flower shopping','wholesale flower auction','reverse flower auction','green certification carbon credit trees'];

function send(res, code, obj, headers={}) { const body = typeof obj === 'string' ? obj : JSON.stringify(obj); res.writeHead(code, { 'content-type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', ...headers }); res.end(body); }
function jsonLine(obj) { fs.appendFile(LOG_FILE, JSON.stringify(obj) + '\n', () => {}); }
function readLines(max = 50000) { if (!fs.existsSync(LOG_FILE)) return []; const txt = fs.readFileSync(LOG_FILE, 'utf8'); return txt.trim().split('\n').filter(Boolean).slice(-max).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
function bodyJson(req) { return new Promise(resolve => { let data=''; req.on('data', c => data += c); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } }); }); }
function dayOf(ts) { return new Date(ts).toISOString().slice(0, 10); }
function safeUrl(u) { try { return new URL(u).toString(); } catch { return SITE_URL; } }
function hostOf(u) { try { return new URL(u).hostname; } catch { return String(u || '').replace(/^https?:\/\//,'').split('/')[0] || 'unknown'; } }
async function fetchText(url, timeoutMs = 12000) { const ctrl = new AbortController(); const id = setTimeout(() => ctrl.abort(), timeoutMs); try { const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 SEOService/1.0' } }); const text = await res.text(); return { ok: res.ok, status: res.status, text, headers: Object.fromEntries(res.headers.entries()) }; } finally { clearTimeout(id); } }
function extract(html, re) { const m = html.match(re); return m ? m[1].trim().replace(/\s+/g, ' ') : ''; }
function count(re, s) { return (s.match(re) || []).length; }
function safeRef(r) { try { return new URL(r).hostname; } catch { return String(r).slice(0,80); } }
function top(obj) { return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value})); }
function buildRecommendations(x, target) { const out=[]; const targetHost = hostOf(target); if (!x.title || x.title.length < 8 || x.title.length > 80) out.push('首页 title 控制在 8-80 字符，包含“植物猎人/Plant Hunter”和核心业务词。'); if (!x.desc || x.desc.length < 35 || x.desc.length > 180) out.push('description 控制在 35-180 字符，写清业务和品牌。'); if (!x.canonical) out.push('增加 canonical，避免重复收录。'); else if (!(x.canonical.includes('horiculture.space') || targetHost === '106.12.91.182')) out.push('canonical 建议统一指向国外主域 horiculture.space；国内苏州站保留独立入口。'); if (!x.ogTitle) out.push('增加 OpenGraph/Twitter Card，提升分享点击率。'); if (!x.jsonLdCount) out.push('增加 JSON-LD 结构化数据：WebSite、Organization、ItemList。'); if (x.h1Count !== 1) out.push('每个页面保持一个明确 H1。'); if (x.imgWithoutAlt > 0) out.push(`有 ${x.imgWithoutAlt} 张图片缺 alt。`); if (!x.robotsOk) out.push('补 robots.txt。'); if (!x.sitemapOk) out.push('补 sitemap.xml 并提交搜索引擎。'); if (targetHost !== 'horiculture.space' && targetHost !== '106.12.91.182') out.push('国外备用域建议 301 到 horiculture.space；国内苏州站可保留独立入口并用独立监控。'); return out; }


function cfRequestJson(pathname, { method = 'GET', body = null } = {}) {
  if (!CF_API_TOKEN) return Promise.reject(new Error('Cloudflare API Token 未配置'));
  const payload = body ? JSON.stringify(body) : null;
  const forcedIp = process.env.CLOUDFLARE_API_IP || '104.19.192.177';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudflare.com',
      servername: 'api.cloudflare.com',
      path: pathname.startsWith('/client/v4') ? pathname : `/client/v4${pathname}`,
      method,
      timeout: 25000,
      lookup: (_host, opts, cb) => {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        if (opts?.all) cb(null, [{ address: forcedIp, family: 4 }]);
        else cb(null, forcedIp, 4);
      },
      headers: {
        authorization: `Bearer ${CF_API_TOKEN}`,
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); }
        catch (e) { reject(new Error(`Cloudflare API JSON parse failed: ${e.message}; status=${res.statusCode}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Cloudflare API timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function cfApi(pathname) {
  const data = await cfRequestJson(pathname);
  if (!data.success) throw new Error((data.errors || []).map(e => e.message).join('; ') || 'Cloudflare API error');
  return data.result;
}
async function getCfZoneId() {
  if (CF_ZONE_ID) return CF_ZONE_ID;
  const zones = await cfApi(`/zones?name=${encodeURIComponent(CF_ZONE_NAME)}`);
  if (!zones || !zones[0]?.id) throw new Error(`Cloudflare Zone not found: ${CF_ZONE_NAME}`);
  return zones[0].id;
}
async function verifyCloudflareToken() {
  if (!CF_API_TOKEN) return { configured: false, valid: false, error: 'Cloudflare API Token 未配置' };
  const data = await cfRequestJson('/client/v4/user/tokens/verify');
  return {
    configured: true,
    valid: !!data.success,
    status: data.result?.status || null,
    id: data.result?.id || null,
    errors: data.errors || [],
  };
}
async function fetchCloudflareAnalytics(days = 30) {
  if (!CF_API_TOKEN) return { configured: false, error: 'Cloudflare API Token 未配置' };
  const zoneTag = await getCfZoneId();
  const end = new Date();
  const start = new Date(Date.now() - (Math.max(1, days) - 1) * 86400000);
  const since = start.toISOString().slice(0, 10);
  const until = end.toISOString().slice(0, 10);
  const query = `query($zoneTag: string, $since: Date!, $until: Date!, $limit: Int!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(limit: $limit, filter: { date_geq: $since, date_leq: $until }) {
          dimensions { date }
          sum { requests pageViews bytes cachedRequests threats }
          uniq { uniques }
        }
      }
    }
  }`;
  const data = await cfRequestJson('/client/v4/graphql', {
    method: 'POST',
    body: { query, variables: { zoneTag, since, until, limit: Math.max(1, days) } },
  });
  if (data.errors?.length) throw new Error(data.errors.map(e => e.message).join('; '));
  const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  const byDay = {};
  let requests = 0, pageViews = 0, uniques = 0, bytes = 0, cachedRequests = 0, threats = 0;
  for (const g of groups) {
    const d = g.dimensions?.date;
    const req = g.sum?.requests || 0;
    const pv = g.sum?.pageViews || 0;
    const un = g.uniq?.uniques || 0;
    byDay[d] = { requests: req, pageViews: pv, uniques: un };
    requests += req;
    pageViews += pv;
    uniques += un;
    bytes += g.sum?.bytes || 0;
    cachedRequests += g.sum?.cachedRequests || 0;
    threats += g.sum?.threats || 0;
  }
  return {
    configured: true,
    source: 'cloudflare',
    zoneName: CF_ZONE_NAME,
    zoneTag,
    accountId: CF_ACCOUNT_ID || null,
    days,
    since,
    until,
    requests,
    pageViews,
    uniques,
    bytes,
    cachedRequests,
    threats,
    byDay,
    note: 'Cloudflare 真实边缘统计；uniques 为 Cloudflare 估算独立访客。',
  };
}

function analyticsSummary(days = 30, hostFilter = '') { const lines=readLines(); const since=Date.now()-days*86400000; const recent=lines.filter(x=>Date.parse(x.ts)>=since && (!hostFilter || x.host === hostFilter)); const byDay={}, byPath={}, byReferrer={}, byLang={}, byHost={}; const visitors=new Set(); for (const x of recent) { byDay[dayOf(x.ts)] = (byDay[dayOf(x.ts)] || 0) + 1; byPath[x.path || '/']=(byPath[x.path || '/']||0)+1; const ref=x.referrer?safeRef(x.referrer):'direct'; byReferrer[ref]=(byReferrer[ref]||0)+1; const h=x.host || hostOf(x.origin) || 'unknown'; byHost[h]=(byHost[h]||0)+1; if(x.lang) byLang[x.lang]=(byLang[x.lang]||0)+1; if(x.ipHash) visitors.add(`${h}:${x.ipHash}`); } return { days, host: hostFilter || 'all', pageviews: recent.length, estimatedVisitors: visitors.size, byDay, byHost, topHosts: top(byHost), topPages: top(byPath), topReferrers: top(byReferrer), languages: top(byLang), note: '访问人数是基于埋点日志的估算独立访客；历史 Cloudflare/Google 数据需要配置对应 API Token。' }; }
async function auditOne(target) { const [home,robots,sitemap]=await Promise.allSettled([fetchText(target), fetchText(new URL('/robots.txt', target).toString(),6000), fetchText(new URL('/sitemap.xml', target).toString(),6000)]); const h=home.value?.text || ''; const title=extract(h, /<title[^>]*>([\s\S]*?)<\/title>/i); const desc=extract(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || extract(h, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i); const canonical=extract(h, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i); const ogTitle=extract(h, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i); const jsonLdCount=count(/<script[^>]+type=["']application\/ld\+json["']/gi,h); const h1Count=count(/<h1[\s>]/gi,h); const imgWithoutAlt=count(/<img(?![^>]*\balt=)[^>]*>/gi,h); const hasBrand=/植物猎人|Plant Hunter/i.test(h + title + desc); const targetHost=hostOf(target); const scoreParts=[title.length>=8&&title.length<=80, desc.length>=35&&desc.length<=180, !!canonical, (canonical.includes('horiculture.space') || targetHost === '106.12.91.182'), !!ogTitle, jsonLdCount>0, h1Count===1, robots.value?.ok, sitemap.value?.ok, hasBrand]; const score=Math.round(scoreParts.filter(Boolean).length/scoreParts.length*100); return { target, host: hostOf(target), checkedAt: new Date().toISOString(), score, status: home.value?.status || 0, title, description: desc, canonical, ogTitle, jsonLdCount, h1Count, imgWithoutAlt, hasBrand, robots: { ok: !!robots.value?.ok, status: robots.value?.status || 0 }, sitemap: { ok: !!sitemap.value?.ok, status: sitemap.value?.status || 0 }, recommendations: buildRecommendations({ title, desc, canonical, ogTitle, jsonLdCount, h1Count, imgWithoutAlt, robotsOk: robots.value?.ok, sitemapOk: sitemap.value?.ok }, target) }; }

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') return send(res, 200, '<!doctype html><meta charset="utf-8"><title>SEO Service</title><body style="font-family:system-ui;padding:40px"><h1>SEO Service</h1><p>API: <a href="/api/health">/api/health</a> · <a href="/api/seo/audit-all">/api/seo/audit-all</a> · <a href="/api/seo/rankings">/api/seo/rankings</a> · <a href="/api/analytics/summary">/api/analytics/summary</a></p></body>');
    if (url.pathname === '/api/health') return send(res, 200, { status: 'ok', service: 'seo-service', site: SITE_URL, sites: SITE_URLS, time: new Date().toISOString() });
    if (url.pathname === '/api/track' && req.method === 'POST') { const b = await bodyJson(req); const ip = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0]; const host = String(b.host || hostOf(b.origin) || req.headers.host || 'unknown').slice(0,120); jsonLine({ ts: new Date().toISOString(), host, origin: String(b.origin || '').slice(0,200), path: String(b.path || '/').slice(0,300), referrer: String(b.referrer || '').slice(0,500), title: String(b.title || '').slice(0,200), lang: String(b.lang || '').slice(0,20), screen: String(b.screen || '').slice(0,50), ua: String(req.headers['user-agent'] || '').slice(0,300), ipHash: Buffer.from(ip).toString('base64').slice(0,16) }); return send(res, 200, { ok: true }); }
    if (url.pathname === '/api/analytics/summary') return send(res, 200, analyticsSummary(Number(url.searchParams.get('days') || 30), url.searchParams.get('host') || ''));
    if (url.pathname === '/api/analytics/cloudflare') { try { return send(res, 200, await fetchCloudflareAnalytics(Number(url.searchParams.get('days') || 30))); } catch (e) { return send(res, 200, { configured: !!CF_API_TOKEN, source: 'cloudflare', error: e.message, note: 'Cloudflare Analytics 暂不可用，检查 Token 权限或 Zone。' }); } }
    if (url.pathname === '/api/cloudflare/verify') return send(res, 200, await verifyCloudflareToken());
    if (url.pathname === '/api/seo/audit') return send(res, 200, await auditOne(safeUrl(url.searchParams.get('url') || SITE_URL)));
    if (url.pathname === '/api/seo/audit-all') return send(res, 200, { primary: SITE_URL, sites: await Promise.all(SITE_URLS.map(auditOne)) });
    if (url.pathname === '/api/seo/rankings') { const keywords=String(url.searchParams.get('keywords') || KEYWORDS.join('\n')).split(/[\n,，]+/).map(s=>s.trim()).filter(Boolean).slice(0,20); const domains=SITE_URLS.map(hostOf); const results=[]; for (const keyword of keywords) { const searchUrl='https://www.bing.com/search?q='+encodeURIComponent(keyword)+'&count=20'; try { const {text}=await fetchText(searchUrl,8000); const urls=[...text.matchAll(/<a href="(https?:\/\/[^"#]+)"/g)].map(m=>m[1]).filter(u=>!u.includes('bing.com')); const matches=domains.map(domain=>{ const pos=urls.findIndex(u=>{ try { return new URL(u).hostname.includes(domain); } catch { return false; } }); return { domain, rank: pos>=0?pos+1:null, found:pos>=0 }; }); results.push({ keyword, engine:'bing', matches, found: matches.some(m=>m.found), checkedAt:new Date().toISOString() }); } catch(e) { results.push({ keyword, engine:'bing', matches: domains.map(domain=>({domain, rank:null, found:false})), found:false, error:e.name==='AbortError'?'timeout':e.message, checkedAt:new Date().toISOString() }); } } return send(res, 200, { site:SITE_URL, domains, results, note:'公开搜索结果会因地区/个性化波动；准确排名建议接入 Google Search Console / Bing Webmaster Tools API。' }); }
    if (url.pathname === '/api/seo/trends') return send(res, 200, trendsPayload());
    if (url.pathname === '/api/seo/keywords') return send(res, 200, { keywords: KEYWORDS });
    return send(res, 404, { error: 'not found' });
  } catch (e) { return send(res, 500, { error: e.message }); }
}
http.createServer(handle).listen(PORT, '0.0.0.0', () => console.log(`SEO service listening on ${PORT}, primary=${SITE_URL}`));
