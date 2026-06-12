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
      </div>
    </div>
  );
}
