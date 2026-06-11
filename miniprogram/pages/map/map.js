// pages/map/map.js
const api = require('../../utils/api')

Page({
  data: {
    latitude: 39.9042,
    longitude: 116.4074,
    markers: [],
    showList: false,
    selectedSupplier: null,
    products: [],
  },

  onLoad() {
    this.getLocation()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude })
        this.loadMarkers()
      },
      fail: () => {
        wx.showToast({ title: '请开启定位', icon: 'none' })
        this.loadMarkers()
      }
    })
  },

  async loadMarkers() {
    const map = wx.createMapContext('map', this)
    map.getRegion({
      success: async (region) => {
        try {
          const data = await api.getMapMarkers({
            swLng: region.southwest.longitude,
            swLat: region.southwest.latitude,
            neLng: region.northeast.longitude,
            neLat: region.northeast.latitude,
          })
          const markers = (data.markers || []).map((m, i) => ({
            id: i,
            latitude: m.location?.coordinates?.[1] || 39.9,
            longitude: m.location?.coordinates?.[0] || 116.4,
            title: m.name,
            iconPath: '/images/flower-marker.png',
            width: 32, height: 32,
            callout: {
              content: `${m.name} (${m.productCount}款)`,
              display: 'ALWAYS',
              borderRadius: 8,
              padding: 6,
              fontSize: 12,
            },
            supplierData: m,
          }))
          this.setData({ markers })
        } catch (e) {
          console.error('Load markers error:', e)
        }
      }
    })
  },

  onMarkerTap(e) {
    const marker = this.data.markers[e.markerId]
    if (marker?.supplierData) {
      this.showSupplierProducts(marker.supplierData)
    }
  },

  async showSupplierProducts(supplier) {
    try {
      const data = await api.getSupplierProducts(supplier.id)
      this.setData({
        showList: true,
        selectedSupplier: supplier,
        products: data.products || [],
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  closeList() {
    this.setData({ showList: false })
  },

  onRegionChange() {
    this.loadMarkers()
  },
})
