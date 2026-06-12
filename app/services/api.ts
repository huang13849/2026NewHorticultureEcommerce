const API_BASE = 'http://100.76.15.64:3010/api';

async function request(path, options = {}) {
  try {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    console.error(`API Error [${path}]:`, e.message);
    throw e;
  }
}

export const API = {
  // 认证
  login: (phone, code = '123456', deviceInfo = {}) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code, deviceInfo }),
    }),

  sendCode: (phone) =>
    request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  getMe: (token) =>
    request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateLocation: (token, lat, lng, address) =>
    request('/auth/location', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ latitude: lat, longitude: lng, address }),
    }),

  updateAddress: (token, address) =>
    request('/auth/address', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(address),
    }),

  // 商品
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products?${qs}`);
  },

  getProduct: (id) => request(`/products/${id}`),

  // 推荐
  getHomeRecommendations: (lat, lng) => {
    const qs = lat ? `?lat=${lat}&lng=${lng}` : '';
    return request(`/recommend/home${qs}`);
  },

  getRecommendations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/recommend?${qs}`);
  },

  // 地图
  getMapViewport: (swLng, swLat, neLng, neLat) =>
    request(`/map/viewport?swLng=${swLng}&swLat=${swLat}&neLng=${neLng}&neLat=${neLat}`),

  getNearbyProducts: (lng, lat, radius = 10) =>
    request(`/map/nearby?lng=${lng}&lat=${lat}&radius=${radius}`),

  getSupplierProducts: (supplierId) =>
    request(`/map/supplier/${supplierId}/products`),

  // 种花
  getPlants: () => request('/garden/plants'),

  getMyGarden: (token) =>
    request('/garden/my-garden', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  plantSeed: (token, plantId) =>
    request('/garden/plant', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plantId }),
    }),

  waterPlot: (token, plotId) =>
    request(`/garden/water/${plotId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  sunshinePlot: (token, plotId) =>
    request(`/garden/sunshine/${plotId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  claimGift: (token, plotId) =>
    request(`/garden/claim-gift/${plotId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
};
