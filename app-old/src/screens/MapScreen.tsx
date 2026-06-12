import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Modal, FlatList,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { API } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要位置权限来推荐附近花店');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      loadMarkers(loc.coords);
    } catch (e) {
      console.error('Location error:', e);
      // 默认北京
      setLocation({ latitude: 39.9042, longitude: 116.4074 });
    }
  };

  const loadMarkers = async (coords) => {
    try {
      const data = await API.getMapMarkers(coords);
      setMarkers(data.markers || []);
    } catch (e) {
      console.error('Load markers error:', e);
    }
  };

  const onRegionChange = async (region) => {
    // 地图移动时重新加载
    const swLng = region.longitude - region.longitudeDelta / 2;
    const swLat = region.latitude - region.latitudeDelta / 2;
    const neLng = region.longitude + region.longitudeDelta / 2;
    const neLat = region.latitude + region.latitudeDelta / 2;

    try {
      const data = await API.getMapViewport(swLng, swLat, neLng, neLat);
      setMarkers(data.markers || []);
    } catch (e) { /* 忽略频繁请求错误 */ }
  };

  const onMarkerPress = async (marker) => {
    setSelectedSupplier(marker);
    try {
      const data = await API.getSupplierProducts(marker.id);
      setSupplierProducts(data.products || []);
      setModalVisible(true);
    } catch (e) {
      console.error('Load supplier products error:', e);
    }
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>📍 正在获取您的位置...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation
        showsMyLocationButton
      >
        {/* 用户位置标记 */}
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title="我的位置"
          pinColor="blue"
        />

        {/* 供应商标记 */}
        {markers.map((marker, idx) => (
          <Marker
            key={marker.id?.toString() || idx}
            coordinate={{
              latitude: marker.location?.coordinates?.[1] || 0,
              longitude: marker.location?.coordinates?.[0] || 0,
            }}
            onPress={() => onMarkerPress(marker)}
          >
            <View style={styles.customMarker}>
              <Text style={styles.markerEmoji}>🌺</Text>
              <Text style={styles.markerCount}>{marker.productCount}</Text>
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.name}</Text>
                <Text style={styles.calloutInfo}>
                  {marker.productCount} 个商品 · 均价 ¥{Math.round(marker.avgPrice)}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchText}>🔍 搜索花店或花卉...</Text>
      </View>

      {/* 重新定位按钮 */}
      <TouchableOpacity
        style={styles.locateButton}
        onPress={getUserLocation}
      >
        <Text style={styles.locateText}>📍</Text>
      </TouchableOpacity>

      {/* 供应商商品列表弹窗 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSupplier?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={supplierProducts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('ProductDetail', { id: item._id });
                  }}
                >
                  <Text style={styles.productItemName}>{item.name}</Text>
                  <Text style={styles.productItemPrice}>¥{item.price}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>暂无商品</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 16, color: '#666' },
  map: { width, height },
  customMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerEmoji: { fontSize: 16 },
  markerCount: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
  callout: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minWidth: 150,
  },
  calloutTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  calloutInfo: { fontSize: 12, color: '#666', marginTop: 2 },
  searchBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchText: { color: '#999', fontSize: 14 },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: 30,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  locateText: { fontSize: 24 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 20, color: '#999' },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productItemName: { fontSize: 15, color: '#333', flex: 1 },
  productItemPrice: { fontSize: 15, fontWeight: 'bold', color: '#E53935' },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
});
