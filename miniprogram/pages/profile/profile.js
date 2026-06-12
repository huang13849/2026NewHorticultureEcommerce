// pages/profile/profile.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    user: null,
    phone: '',
    code: '',
    isLogin: false,
    addresses: [],
  },

  onShow() {
    const user = app.globalData.user
    if (user) {
      this.setData({ user, isLogin: true, addresses: user.address || [] })
    }
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onCodeInput(e) { this.setData({ code: e.detail.value }) },

  async sendCode() {
    if (!this.data.phone) return wx.showToast({ title: '请输入手机号', icon: 'none' })
    try {
      await api.sendCode(this.data.phone)
      wx.showToast({ title: '验证码已发送' })
    } catch (e) {
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
  },

  async login() {
    const { phone, code } = this.data
    if (!phone || !code) return wx.showToast({ title: '请填写完整', icon: 'none' })

    try {
      const res = await api.login(phone, code, {
        platform: 'miniprogram',
        sessionId: wx.getStorageSync('sessionId') || '',
      })
      app.globalData.user = res.user
      app.globalData.token = res.token
      wx.setStorageSync('token', res.token)
      this.setData({ user: res.user, isLogin: true, addresses: res.user.address || [] })
      wx.showToast({ title: '登录成功' })
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
  },

  async getLocation() {
    try {
      const loc = await wx.getLocation({ type: 'gcj02' })
      await api.updateLocation(loc.latitude, loc.longitude)
      wx.showToast({ title: '位置已更新' })
    } catch (e) {
      wx.showToast({ title: '获取位置失败', icon: 'none' })
    }
  },

  addAddress() {
    wx.chooseAddress({
      success: async (res) => {
        try {
          await api.updateAddress({
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo,
            isDefault: this.data.addresses.length === 0,
          })
          this.onShow()
        } catch (e) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  logout() {
    app.globalData.user = null
    app.globalData.token = null
    wx.removeStorageSync('token')
    this.setData({ user: null, isLogin: false, addresses: [] })
  },
})
