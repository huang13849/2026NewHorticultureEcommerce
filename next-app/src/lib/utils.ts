/**
 * 工具函数
 */

const MINIO_ENDPOINT = 'http://100.96.54.109:9000';
const MINIO_BUCKET = 'supply-chain';

/**
 * 获取商品图片 URL
 */
export function getProductImage(image: string | undefined): string {
  if (!image) return 'https://via.placeholder.com/200x200/4CAF50/fff?text=🌸';
  if (image.startsWith('http')) return image;
  return `${MINIO_ENDPOINT}/${MINIO_BUCKET}/${image}`;
}

/**
 * 格式化价格
 */
export function formatPrice(price: number | undefined): string {
  if (price == null) return '¥--';
  return `¥${price.toFixed(2)}`;
}

/**
 * 格式化距离
 */
export function formatDistance(km: number | undefined): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * 获取 token（客户端）
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('flower_token');
  }
  return null;
}
