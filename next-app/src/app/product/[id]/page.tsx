import ProductDetailClient from './ProductDetailClient';
import { PRODUCT_DETAIL } from '@/lib/v1/data';

/** CF Pages 静态导出需要预渲染的 id 列表。后续接真实商品数据时改成从 API/DB 取 */
export function generateStaticParams() {
  return [
    { id: PRODUCT_DETAIL.id },
    { id: '21-red-rose' },
    { id: 'sunflower-bouquet' },
    { id: 'carnation-bouquet' },
    { id: 'mixed-bouquet' },
  ];
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient id={params.id} />;
}
