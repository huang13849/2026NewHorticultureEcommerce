/**
 * API 客户端
 * 通过 flower-api (端口 3010) 间接访问 API Gateway
 */

import { cache } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

// ===== 类型定义 =====
export interface Product {
  _id: string;
  title: string;
  englishTitle?: string;
  name?: string;
  price?: number;
  sellPrice?: number;
  settlementPrice?: number;
  costPrice?: number;
  shippingFee?: number;
  shipping_description?: string;
  images?: string[];
  panorama_images?: string[];
  package_images?: string[];
  detail_images?: string[];
  description?: string;
  category?: string;
  flowerName?: string;
  specSize?: string;
  origin?: string;
  stock?: number;
  minOrder?: number;
  sellerName?: string;
  location?: { type: string; coordinates: [number, number] };
  distance?: number;
  supplierId?: string;
  supplier?: Supplier;
  salesCount?: number;
  salesVolume?: number;
  discountPrice?: number;
  status?: string;
  isListed?: boolean;
  tradeType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id?: string;
  _id?: string;
  name: string;
  address?: string;
  location?: { type: string; coordinates: [number, number] };
  phone?: string;
  description?: string;
  categories?: string[];
  productCount?: number;
  avgPrice?: number;
}

export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string;
  address?: Address[];
  location?: { type: string; coordinates: [number, number] };
  gardenStats?: { totalPlanted: number; totalCompleted: number; totalGifted: number };
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export interface Address {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface Plant {
  _id: string;
  name: string;
  emoji: string;
  description: string;
  growDays: number;
  difficulty: 'easy' | 'medium' | 'hard';
  stages?: { day: number; name: string; emoji: string; description: string }[];
  image?: string;
}

export interface GardenPlot {
  id: string;
  plant?: Plant;
  plantName: string;
  plantId: string;
  plantedAt: string;
  daysPassed: number;
  totalDays: number;
  progress: number;
  isMature: boolean;
  stage: { name: string; emoji: string; level: number };
  status: string;
  currentDay: number;
  growDays: number;
  currentStageEmoji: string;
  waterCount: number;
  lastWateredAt?: string;
  canWater: boolean;
  claimedAt?: string;
  checkInDates: string[];
}

export interface HomeSection {
  title: string;
  type: string;
  products: Product[];
}

export interface MapMarker {
  id: string;
  name: string;
  location: { type: string; coordinates: [number, number] };
  address?: string;
  productCount: number;
  avgPrice: number;
  phone?: string;
  categories?: string[];
}

// ===== Token 管理 =====
let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('flower_token', token);
      sessionStorage.setItem('flower_token', token);
      // Cookie fallback for hard reload / cross-page navigation. Not HttpOnly because client reads it.
      document.cookie = `flower_token=${encodeURIComponent(token)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    } else {
      localStorage.removeItem('flower_token');
      sessionStorage.removeItem('flower_token');
      document.cookie = 'flower_token=; path=/; max-age=0; SameSite=Lax';
    }
  }
}

function getCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )flower_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('flower_token')
      || sessionStorage.getItem('flower_token')
      || getCookieToken();
    // Rehydrate missing stores so subsequent navigation is stable
    if (authToken) setToken(authToken);
  }
  return authToken;
}

// ===== 通用请求 =====
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ===== API 方法 =====

export const api = {
  // ----- 认证 -----
  login: (phone: string, code?: string, password?: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code, password }),
    }),

  getMe: () =>
    request<User>('/auth/me'),

  updateLocation: (latitude: number, longitude: number, address?: string) =>
    request<{ message: string }>('/auth/location', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, address }),
    }),

  updateAddress: (addressData: Partial<Address>) =>
    request<{ message: string; address: Address[] }>('/auth/address', {
      method: 'PUT',
      body: JSON.stringify(addressData),
    }),

  // ----- 商品 -----
  getProducts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ products: Product[]; total: number; page: number }>(`/products?${qs}`);
  },

  getProduct: (id: string) =>
    request<Product>(`/products/${id}`),

  // ----- 推荐 -----
  getHomeRecommendations: (lat?: number, lng?: number) => {
    const qs = lat ? `?lat=${lat}&lng=${lng}` : '';
    return request<{ sections: HomeSection[] }>(`/recommend/home${qs}`);
  },

  getRecommendations: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ recommendations: Product[] }>(`/recommend?${qs}`);
  },

  // ----- 地图 -----
  getMapViewport: (swLng: number, swLat: number, neLng: number, neLat: number) =>
    request<{ markers: MapMarker[]; total: number }>(
      `/map/viewport?swLng=${swLng}&swLat=${swLat}&neLng=${neLng}&neLat=${neLat}`
    ),

  getNearbyProducts: (lng: number, lat: number, radius = 10) =>
    request<{ products: Product[]; total: number }>(
      `/map/nearby?lng=${lng}&lat=${lat}&radius=${radius}`
    ),

  getSupplierProducts: (supplierId: string) =>
    request<{ supplier: Supplier; products: Product[] }>(
      `/map/supplier/${supplierId}/products`
    ),

  // ----- 种花 -----
  getPlants: () =>
    request<{ plants: Plant[] }>('/garden/plants'),

  getMyGarden: () =>
    request<{ garden: GardenPlot[]; stats: any }>('/garden/my-garden'),

  plantSeed: (plantId: string) =>
    request<{ message: string; plot: any }>('/garden/plant', {
      method: 'POST',
      body: JSON.stringify({ plantId }),
    }),

  waterPlot: (plotId: string) =>
    request<{ message: string; waterCount: number; progress: number }>(
      `/garden/water/${plotId}`,
      { method: 'POST' }
    ),


  // ----- 购物 & 支付 -----
  getShopProducts: () =>
    request<{ products: any[] }>('/payment/products'),

  createOrder: (items: {productId: string; quantity: number}[], payMethod: 'wechat' | 'alipay') =>
    request<any>('/payment/order', {
      method: 'POST',
      body: JSON.stringify({ items, payMethod }),
    }),

  simulatePay: (orderId: string) =>
    request<{ message: string; order: any }>(`/payment/pay/${orderId}`, {
      method: 'POST',
    }),

  getOrder: (orderId: string) =>
    request<{ order: any }>(`/payment/order/${orderId}`),

  getOrders: () =>
    request<{ orders: any[]; total: number }>('/payment/orders'),


  // ----- 拍卖 -----
  getAuctionItems: () =>
    request<{ items: any[]; total: number }>('/auction/items'),

  startAuction: (productId: string) =>
    request<any>(`/auction/start/${productId}`, { method: 'POST' }),

  placeBid: (productId: string, bidderName: string, bidderPhone: string) =>
    request<any>(`/auction/bid/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ bidderName, bidderPhone }),
    }),

  getAuctionStatus: (productId: string) =>
    request<any>(`/auction/status/${productId}`),

  auctionCheckout: (productId: string, data: any) =>
    request<any>(`/auction/checkout/${productId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  claimGift: (plotId: string) =>
    request<{ message: string; claim: any }>(
      `/garden/claim/${plotId}`,
      { method: 'POST' }
    ),
};
