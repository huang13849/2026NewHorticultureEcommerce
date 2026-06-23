/**
 * 部署版本统一配置 (国内版 cn / 国际版 global)
 *
 * 由构建时环境变量 NEXT_PUBLIC_REGION 驱动:
 *   - 国内版(苏州): Dockerfile.suzhou 设 NEXT_PUBLIC_REGION=cn
 *   - 国际版(Cloudflare Pages): CF 项目环境变量 NEXT_PUBLIC_REGION=global
 *   - 本地开发(未设): 视为 cn(可访问内网/苏州数据)
 *
 * ⚠️ 所有"国内/国际差异"(API、图床、默认语言、支付方式、地图等)
 *    都应从这里读取,不要在各页面散落 process.env 判断。
 */

export type DeployRegion = 'cn' | 'global';

export const DEPLOY_REGION: DeployRegion =
  process.env.NEXT_PUBLIC_REGION === 'global' ? 'global' : 'cn';

export const IS_GLOBAL = DEPLOY_REGION === 'global';
export const IS_CN = DEPLOY_REGION === 'cn';

/**
 * API 基地址。
 * 国内版/国际版都走【同源 /api】:
 *   - 国内版(苏州): nginx location /api/ -> flower-api:3010
 *   - 国际版(CF):   Pages Function functions/api/[[path]].js -> 苏州 flower-api
 * 仅当显式传入 NEXT_PUBLIC_API_URL 时才覆盖(例如本地直连某后端调试)。
 */
export const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * 图床基地址(MinIO 反代路径)。
 *   - 国内版(苏州): nginx /minio/ -> 苏州本地 MinIO
 *   - 国际版(CF):   Pages Function functions/minio/[[path]].js -> LA(VPS-209) MinIO
 * 两者都是同源 /minio 相对路径,故统一用 /minio。
 */
export const MINIO_BASE: string = process.env.NEXT_PUBLIC_MINIO_BASE || '/minio';
export const MINIO_BUCKET = 'supply-chain';

/** 默认语言: 国内版中文, 国际版英文(用户仍可在 UI 切换) */
export const DEFAULT_LANG: string = IS_GLOBAL ? 'en' : 'zh';

/** 支付方式(按部署区域可用): 国内版 支付宝+微信, 国际版 Stripe+PayPal */
export const PAY_METHODS: string[] = IS_GLOBAL
  ? ['stripe', 'paypal']
  : ['alipay', 'wechat'];

/** 供应商地图 iframe 源 */
export const MAP_SRC: string = IS_CN
  ? '/supplier-map/?v=202606150236'
  : '/supplier-map/?v=202606150236';

export const deployConfig = {
  region: DEPLOY_REGION,
  isGlobal: IS_GLOBAL,
  isCN: IS_CN,
  apiBase: API_BASE,
  minioBase: MINIO_BASE,
  minioBucket: MINIO_BUCKET,
  defaultLang: DEFAULT_LANG,
  payMethods: PAY_METHODS,
  mapSrc: MAP_SRC,
};

export default deployConfig;
