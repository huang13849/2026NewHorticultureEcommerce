import axios from 'axios';

const BASE_URL = __DEV__ 
  ? 'http://100.96.54.109:3010/api' 
  : 'https://your-domain.com/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// 请求拦截器：自动加 token
api.interceptors.request.use(config => {
  const token = globalThis.__USER_TOKEN__;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const API = {
  // ===== 认证 =====
  sendCode: (phone: string) => api.post('/auth/send-code', { phone }),
  login: (phone: string, code: string, deviceInfo?: any) =>
    api.post('/auth/login', { phone, code, deviceInfo }),
  getMe: () => api.get('/auth/me').then(r => r.data),
  updateLocation: (lat: number, lng: number, address?: string) =>
    api.put('/auth/location', { latitude: lat, longitude: lng, address }),
  updateAddress: (address: any) => api.put('/auth/address', address),

  // ===== 商品 =====
  getProducts: (params?: any) => api.get('/products', { params }).then(r => r.data),
  getProduct: (id: string) => api.get(`/products/${id}`).then(r => r.data),

  // ===== 推荐 =====
  getRecommendations: (params?: any) => api.get('/recommend', { params }).then(r => r.data),
  getHomeRecommendations: (params?: any) => api.get('/recommend/home', { params }).then(r => r.data),

  // ===== 地图 =====
  getMapMarkers: (params: any) => api.get('/map/viewport', { params }).then(r => r.data),
  getNearbyProducts: (lng: number, lat: number, radius?: number) =>
    api.get('/map/nearby', { params: { lng, lat, radius } }).then(r => r.data),
  getSupplierProducts: (supplierId: string) =>
    api.get(`/map/supplier/${supplierId}/products`).then(r => r.data),

  // ===== 种花 =====
  getPlants: () => api.get('/garden/plants').then(r => r.data.plants),
  getMyGarden: () => api.get('/garden/my-garden').then(r => r.data.plots),
  plantSeed: (plantId: string) => api.post('/garden/plant', { plantId }).then(r => r.data),
  waterPlot: (plotId: string) => api.post(`/garden/water/${plotId}`).then(r => r.data),
  sunshinePlot: (plotId: string) => api.post(`/garden/sunshine/${plotId}`).then(r => r.data),
  claimGift: (plotId: string) => api.post(`/garden/claim-gift/${plotId}`).then(r => r.data),
};
