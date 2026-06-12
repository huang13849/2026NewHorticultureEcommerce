const API_BASE = 'http://100.96.54.109:3010/api';

App({
  globalData: {
    token: null,
    userInfo: null,
    location: null,
  },

  onLaunch() {
    // 自动登录
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.getUserInfo();
    }
    this.getLocation();
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude,
        };
      },
      fail: () => {
        console.log('获取位置失败');
      }
    });
  },

  async getUserInfo() {
    try {
      const res = await this.request({ url: '/auth/me' });
      this.globalData.userInfo = res;
    } catch (e) {
      console.error('Get user info error:', e);
    }
  },

  request({ url, method = 'GET', data = {} }) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}${url}`,
        method,
        data,
        header: {
          'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : '',
          'Content-Type': 'application/json',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: reject,
      });
    });
  },

  login(phone, code) {
    return this.request({
      url: '/auth/login',
      method: 'POST',
      data: {
        phone,
        code,
        deviceInfo: {
          platform: 'miniprogram',
          sessionId: wx.getStorageSync('sessionId'),
        },
      },
    }).then(res => {
      this.globalData.token = res.token;
      this.globalData.userInfo = res.user;
      wx.setStorageSync('token', res.token);
      return res;
    });
  },
});
