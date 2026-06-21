'use client';

import { Product } from '@/lib/api';
import { getProductImage, formatPrice, formatDistance } from '@/lib/utils';

interface Props {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: Props) {
  // 优先用 panorama_images，其次 images
  const imageUrl = getProductImage(product.panorama_images?.[0] || product.images?.[0]);
  const name = product.title || product.name || '未命名';
  const price = product.sellPrice ?? product.price;
  const shippingText = product.shipping_description || (product.shippingFee === 0 ? '免运费' : product.shippingFee ? `运费 ¥${product.shippingFee}` : '');
  const shippingBadgeClass = "inline-flex max-w-full items-center gap-1 rounded-full border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 shadow-[0_1px_4px_rgba(251,146,60,0.12)]";

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
        <div
          className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-800 truncate">{name}</h3>
          <p className="text-sm font-bold text-red-600 mt-0.5">{formatPrice(price)}</p>
          {shippingText && (
            <p className={`${shippingBadgeClass} mt-1`} title={shippingText}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-white/80 text-[9px] shadow-sm">🚚</span>
              <span className="truncate">{shippingText}</span>
            </p>
          )}
          {product.distance != null && (
            <p className="text-xs text-gray-400">{formatDistance(product.distance)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-36 bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="w-full h-28 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="p-2">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
          {name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-bold text-red-600">{formatPrice(price)}</span>
          {product.distance != null && (
            <span className="text-xs text-gray-400">{formatDistance(product.distance)}</span>
          )}
        </div>
        {shippingText && (
          <div className={`${shippingBadgeClass} mt-1`} title={shippingText}>
            <span className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-white/80 text-[9px] shadow-sm">🚚</span>
            <span className="truncate">{shippingText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
