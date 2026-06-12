import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { API } from '../../services/api';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      // 默认北京位置
      const data = await API.getMapViewport(116.3, 39.9, 116.5, 40.0);
      setMarkers(data.markers || []);
    } catch (e) {
      console.error('Map load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async () => {
    try {
      setLoading(true);
      const data = await API.getNearbyProducts(116.4, 39.9, 50);
      setMarkers(data.products || []);
    } catch (e) {
      console.error('Nearby error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>加载地图数据...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 地图占位区域 - 后续接入高德/腾讯地图SDK */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapText}>地图视图</Text>
        <Text style={styles.mapHint}>接入地图SDK后显示花店位置</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadNearby}>
          <Text style={styles.refreshBtnText}>📍 搜索附近花店</Text>
        </TouchableOpacity>
      </View>

      {/* 供应商/商品列表 */}
      <ScrollView style={styles.list}>
        <Text style={styles.listTitle}>附近 {markers.length} 家花店</Text>
        {markers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无附近花店数据</Text>
            <Text style={styles.emptyHint}>请确认供应商数据包含位置信息</Text>
          </View>
        ) : (
          markers.map((m, i) => (
            <TouchableOpacity
              key={m.id || i}
              style={styles.markerCard}
              onPress={() => setSelectedSupplier(m)}
            >
              <Text style={styles.markerEmoji}>🏪</Text>
              <View style={styles.markerInfo}>
                <Text style={styles.markerName}>{m.name}</Text>
                <Text style={styles.markerDetail}>
                  🌸 {m.productCount || 0} 种花卉 · ¥{Math.round(m.avgPrice || 0)} 起
                </Text>
                {m.address && <Text style={styles.markerAddr}>{m.address}</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholder: {
    height: 280,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  mapEmoji: { fontSize: 48 },
  mapText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 8 },
  mapHint: { fontSize: 13, color: '#795548', marginTop: 4 },
  refreshBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  refreshBtnText: { color: '#fff', fontWeight: 'bold' },
  list: { flex: 1, padding: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  emptyHint: { fontSize: 13, color: '#ccc', marginTop: 4 },
  markerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
  },
  markerEmoji: { fontSize: 32 },
  markerInfo: { marginLeft: 12, flex: 1 },
  markerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  markerDetail: { fontSize: 13, color: '#795548', marginTop: 4 },
  markerAddr: { fontSize: 12, color: '#999', marginTop: 2 },
});
