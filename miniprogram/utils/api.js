const API_BASE = 'http://100.96.54.109:3010/api';

function request(url, method = 'GET', data = {}) {
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: reject,
    });
  });
}

// 获取位置并上传
function updateLocation() {
  wx.getLocation({
    type: 'gcj02',
    success: (loc) => {
      request('/auth/location', 'PUT', {
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    },
  });
}

module.exports = {
  request,
  updateLocation,
  // 认证
  sendCode: (phone) => request('/auth/send-code', 'POST', { phone }),
  login: (phone, code) => request('/auth/login', 'POST', { phone, code, deviceInfo: { platform: 'miniprogram' } }),
  getMe: () => request('/auth/me'),
  updateAddress: (addr) => request('/auth/address', 'PUT', addr),
  // 商品
  getProducts: (params) => request('/products?' + objToQuery(params)),
  getProduct: (id) => request(`/products/${id}`),
  // 推荐
  getHomeRecommend: (params) => request('/recommend/home?' + objToQuery(params)),
  getRecommendations: (params) => request('/recommend?' + objToQuery(params)),
  // 地图
  getMapMarkers: (params) => request('/map/viewport?' + objToQuery(params)),
  getNearby: (lng, lat, radius) => request(`/map/nearby?lng=${lng}&lat=${lat}&radius=${radius}`),
  getSupplierProducts: (id) => request(`/map/supplier/${id}/products`),
  // 种花
  getPlants: () => request('/garden/plants'),
  getMyGarden: () => request('/garden/my-garden'),
  plantSeed: (plantId) => request('/garden/plant', 'POST', { plantId }),
  waterPlot: (plotId) => request(`/garden/water/${plotId}`, 'POST'),
  sunshinePlot: (plotId) => request(`/garden/sunshine/${plotId}`, 'POST'),
  claimGift: (plotId) => request(`/garden/claim-gift/${plotId}`, 'POST'),
};

function objToQuery(obj = {}) {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}
