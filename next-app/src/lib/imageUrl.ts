// src/lib/imageUrl.ts
// 统一图片 URL 解析:同源相对路径,不跨域(space 走 LA,club 走苏州)
export function resolveMinioUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '';
  // 兼容历史数据里被 nginx sub_filter 硬编码为完整 URL 的情况
  // 全部归一化为同源相对路径 /minio/supply-chain/xxx
  const hardcodedHosts = [
    'https://horiculture.club/minio/supply-chain/',
    'http://horiculture.club/minio/supply-chain/',
    'https://horiculture.space/minio/supply-chain/',
    'http://horiculture.space/minio/supply-chain/',
    'http://106.12.91.182/minio/supply-chain/',
    'http://209.141.34.146/minio/supply-chain/',
    'http://100.96.54.109:9000/supply-chain/',
    'http://100.76.15.64:9000/supply-chain/',
  ];
  for (const h of hardcodedHosts) {
    if (raw.startsWith(h)) return '/minio/supply-chain/' + raw.slice(h.length);
  }
  // 已经是相对 minio 路径
  if (raw.startsWith('/minio/')) return raw;
  // 其他 http(s) 图 (如外部图床) 直接放行
  if (raw.startsWith('http')) return raw;
  // 裸 key,拼前缀
  return '/minio/supply-chain/' + raw;
}
