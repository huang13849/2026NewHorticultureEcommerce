import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { API } from '../services/api';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHome();
  }, []);

  const loadHome = async () => {
    try {
      const data = await API.getHomeRecommendations();
      setSections(data.sections || []);
    } catch (e) {
      console.error('Load home error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHome} />}
    >
      {/* 顶部横幅 */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>🌸 花伴</Text>
        <Text style={styles.bannerSubtitle}>让每一朵花找到它的主人</Text>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.mapButtonText}>🗺️ 打开地图找花</Text>
        </TouchableOpacity>
      </View>

      {/* 推荐区域 */}
      {sections.map((section, idx) => (
        <View key={idx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {section.products?.map(product => (
              <TouchableOpacity
                key={product._id}
                style={styles.productCard}
                onPress={() => navigation.navigate('ProductDetail', { id: product._id })}
              >
                <Image
                  source={{ uri: getProductImage(product) }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>¥{product.price}</Text>
                  {product.distance != null && (
                    <Text style={styles.distance}>{product.distance}km</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}

      {/* 每日种花入口 */}
      <TouchableOpacity
        style={styles.gardenBanner}
        onPress={() => navigation.navigate('Garden')}
      >
        <Text style={styles.gardenEmoji}>🌻</Text>
        <View style={styles.gardenText}>
          <Text style={styles.gardenTitle}>每日种花</Text>
          <Text style={styles.gardenDesc}>种一朵花，100天后免费收到家中</Text>
        </View>
        <Text style={styles.gardenArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getProductImage(product) {
  if (product.images?.[0]) {
    const img = product.images[0];
    return img.startsWith('http') ? img : `http://100.96.54.109:9000/supply-chain/${img}`;
  }
  return 'https://via.placeholder.com/200x200/4CAF50/fff?text=🌸';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: {
    backgroundColor: '#4CAF50',
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  bannerTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  bannerSubtitle: { fontSize: 14, color: '#E8F5E9', marginTop: 4 },
  mapButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  mapButtonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  section: { marginTop: 16, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  productCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImage: { width: '100%', height: 120, borderRadius: 8 },
  productName: { fontSize: 13, color: '#333', marginTop: 6, lineHeight: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#E53935' },
  distance: { fontSize: 11, color: '#999' },
  gardenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  gardenEmoji: { fontSize: 40 },
  gardenText: { flex: 1, marginLeft: 12 },
  gardenTitle: { fontSize: 18, fontWeight: 'bold', color: '#F57F17' },
  gardenDesc: { fontSize: 12, color: '#795548', marginTop: 2 },
  gardenArrow: { fontSize: 20, color: '#F57F17' },
});
