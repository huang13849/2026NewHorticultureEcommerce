// pages/garden/garden.js
const api = require('../../utils/api')

Page({
  data: {
    plants: [],
    myGarden: [],
    loading: true,
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const [plants, garden] = await Promise.all([
        api.get('/garden/plants'),
        api.get('/garden/my-garden'),
      ])
      this.setData({
        plants: plants.plants || [],
        myGarden: garden.plots || [],
        loading: false,
      })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  async handlePlant(e) {
    const plantId = e.currentTarget.dataset.id
    try {
      await api.post('/garden/plant', { plantId })
      wx.showToast({ title: '🌱 种植成功！', icon: 'success' })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: e.message || '种植失败', icon: 'none' })
    }
  },

  async handleWater(e) {
    const plotId = e.currentTarget.dataset.id
    try {
      await api.post(`/garden/water/${plotId}`)
      wx.showToast({ title: '💧 浇水成功！', icon: 'success' })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: '今天已浇过水了', icon: 'none' })
    }
  },

  async handleClaim(e) {
    const plotId = e.currentTarget.dataset.id
    try {
      await api.post(`/garden/claim-gift/${plotId}`)
      wx.showToast({ title: '🎉 即将送到您家！', icon: 'success' })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: e.message || '领取失败', icon: 'none' })
    }
  },
})
