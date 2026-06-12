import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  FlatList, ActivityIndicator,
} from 'react-native';
import { API } from '../../services/api';

export default function GardenScreen() {
  const [plants, setPlants] = useState([]);
  const [myGarden, setMyGarden] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plantsData, gardenData] = await Promise.all([
        API.getPlants(),
        API.getMyGarden(),
      ]);
      setPlants(plantsData || []);
      setMyGarden(gardenData || []);
    } catch (e) {
      console.error('Load garden error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlant = async (plantId) => {
    try {
      await API.plantSeed(plantId);
      Alert.alert('🌱 种植成功！', '记得每天来浇水哦~');
      loadData();
    } catch (e) {
      Alert.alert('种植失败', e.message || '请稍后再试');
    }
  };

  const handleWater = async (plotId) => {
    try {
      await API.waterPlot(plotId);
      Alert.alert('💧 浇水成功！', '花花很开心~');
      loadData();
    } catch (e) {
      Alert.alert('提示', e.message || '今天已经浇过水了');
    }
  };

  const handleClaim = async (plotId) => {
    try {
      await API.claimGift(plotId);
      Alert.alert('🎉 恭喜！', '花朵已成熟，将免费送到您的收货地址！');
      loadData();
    } catch (e) {
      Alert.alert('领取失败', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 我的花花园 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌿 我的花花园</Text>
        {myGarden.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>还没有种花哦~</Text>
            <Text style={styles.emptySub}>选择下面的花种开始种植吧！</Text>
          </View>
        ) : (
          myGarden.map(plot => {
            const progress = Math.min((plot.currentDay / plot.growDays) * 100, 100);
            const isMature = plot.status === 'mature';
            const emoji = plot.currentStageEmoji || '🌱';
            return (
              <View key={plot._id} style={[styles.plotCard, isMature && styles.plotMature]}>
                <View style={styles.plotHeader}>
                  <Text style={styles.plotEmoji}>{emoji}</Text>
                  <View style={styles.plotInfo}>
                    <Text style={styles.plotName}>{plot.plantName}</Text>
                    <Text style={styles.plotStatus}>
                      {isMature ? '🌸 已成熟！可领取' : `第 ${plot.currentDay}/${plot.growDays} 天`}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                <View style={styles.plotActions}>
                  {!isMature && (
                    <TouchableOpacity style={styles.waterBtn} onPress={() => handleWater(plot._id)}>
                      <Text style={styles.btnTextWhite}>💧 浇水</Text>
                    </TouchableOpacity>
                  )}
                  {isMature && (
                    <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(plot._id)}>
                      <Text style={styles.btnTextWhite}>🎁 免费领取</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {plot.checkInDates?.length > 0 && (
                  <Text style={styles.checkin}>📅 已打卡 {plot.checkInDates.length} 天</Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* 可种植的花 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌱 选择种植</Text>
        <Text style={styles.sectionDesc}>种满 100 天即可免费获赠！</Text>
        <FlatList
          data={plants}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.plantRow}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.plantCard} onPress={() => handlePlant(item._id)}>
              <Text style={styles.plantEmoji}>{item.emoji}</Text>
              <Text style={styles.plantName}>{item.name}</Text>
              <Text style={styles.plantDays}>{item.growDays}天成熟</Text>
              <Text style={styles.plantDiff}>
                {item.difficulty === 'easy' ? '⭐' : item.difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sectionDesc: { fontSize: 13, color: '#795548', marginTop: 2, marginBottom: 12 },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  emptySub: { fontSize: 13, color: '#ccc', marginTop: 4 },
  plotCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  plotMature: { borderColor: '#FFD700', borderWidth: 2 },
  plotHeader: { flexDirection: 'row', alignItems: 'center' },
  plotEmoji: { fontSize: 40 },
  plotInfo: { marginLeft: 12, flex: 1 },
  plotName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  plotStatus: { fontSize: 13, color: '#795548', marginTop: 2 },
  progressBar: { height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  progressText: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'right' },
  plotActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  waterBtn: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  claimBtn: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flex: 1, alignItems: 'center' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
  checkin: { fontSize: 11, color: '#999', marginTop: 8 },
  plantRow: { justifyContent: 'space-between' },
  plantCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 12, elevation: 2,
  },
  plantEmoji: { fontSize: 48 },
  plantName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 8 },
  plantDays: { fontSize: 12, color: '#795548', marginTop: 4 },
  plantDiff: { marginTop: 4 },
});
