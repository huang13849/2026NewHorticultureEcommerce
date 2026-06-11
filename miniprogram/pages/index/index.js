const app = getApp()

Page({
  data: {
    sections: [],
    loading: true,
  },

  onLoad() {
    this.loadHome()
  },

  onPullDownRefresh() {
    this.loadHome().then(() => wx.stopPullDownRefresh())
  },

  async loadHome() {
    try {
      const res = await api.get('/recommend/home')
      this.setData({ sections: res.sections || [], loading: false })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  goMap() {
    wx.switchTab({ url: '/pages/map/map' })
  },

  goGarden() {
    wx.switchTab({ url: '/pages/garden/garden' })
  },

  goProductDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product/detail?id=${id}` })
  },
})
