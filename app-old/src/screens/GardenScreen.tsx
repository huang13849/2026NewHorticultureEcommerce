import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert,
  FlatList, Dimensions,
} from 'react-native';
import { API } from '../services/api';
import { useUserStore } from '../store/userStore';

const { width } = Dimensions.get('window');

export default function GardenScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [myGarden, setMyGarden] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUserStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plantsData, gardenData] = await Promise.all([
        API.getPlants(),
        API.getMyGarden(),
      ]);
      setPlants(plantsData);
      setMyGarden(gardenData);
    } catch (e) {
      console.error('Load garden error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlant = async (plantId) => {
    if (!user) {
      Alert.alert('请先登录', '种花需要登录哦~', [
        { text: '去登录', onPress: () => navigation.navigate('Profile') },
      ]);
      return;
    }

    try {
      const plot = await API.plantSeed(plantId);
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
      Alert.alert('浇水失败', e.message || '今天已经浇过水了');
    }
  };

  const handleClaimGift = async (plotId) => {
    try {
      const result = await API.claimGift(plotId);
      Alert.alert('🎉 恭喜！', '花朵已成熟，将免费送到您的收货地址！');
      loadData();
    } catch (e) {
      Alert.alert('领取失败', e.message);
    }
  };

  const renderGardenPlot = ({ item }) => {
    const progress = Math.min((item.currentDay / item.growDays) * 100, 100);
    const isMature = item.status === 'mature';
    const isGrowing = item.status === 'growing';
    const currentEmoji = item.currentStageEmoji || '🌱';

    return (
      <View style={[styles.plotCard, isMature && styles.plotCardMature]}>
        <View style={styles.plotHeader}>
          <Text style={styles.plotEmoji}>{currentEmoji}</Text>
          <View style={styles.plotInfo}>
            <Text style={styles.plotName}>{item.plantName}</Text>
            <Text style={styles.plotStatus}>
              {isMature ? '🌸 已成熟！可领取' : `第 ${item.currentDay}/${item.growDays} 天`}
            </Text>
          </View>
        </View>

        {/* 进度条 */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>

        {/* 操作按钮 */}
        <View style={styles.plotActions}>
          {isGrowing && (
            <TouchableOpacity
              style={styles.waterButton}
              onPress={() => handleWater(item._id)}
            >
              <Text style={styles.waterButtonText}>💧 浇水</Text>
            </TouchableOpacity>
          )}
          {isMature && (
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => handleClaimGift(item._id)}
            >
              <Text style={styles.claimButtonText}>🎁 免费领取</Text>
            </TouchableOpacity>
          )}
          {isGrowing && (
            <TouchableOpacity
              style={styles.sunshineButton}
              onPress={() => API.sunshinePlot(item._id)}
            >
              <Text>☀️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 打卡日历 */}
        {item.checkInDates?.length > 0 && (
          <Text style={styles.checkInText}>
            📅 已打卡 {item.checkInDates.length} 天
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 我的花花园 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌿 我的花花园</Text>
        {myGarden.length === 0 ? (
          <View style={styles.emptyGarden}>
            <Text style={styles.emptyText}>还没有种花哦~</Text>
            <Text style={styles.emptySubtext}>选择下面的花种开始种植吧！</Text>
          </View>
        ) : (
          <FlatList
            data={myGarden}
            renderItem={renderGardenPlot}
            keyExtractor={item => item._id}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* 可种植的花 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌱 选择种植</Text>
        <Text style={styles.sectionDesc}>种满 100 天即可免费获赠！</Text>
        <FlatList
          data={plants}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.plantCard}
              onPress={() => handlePlant(item._id)}
            >
              <Text style={styles.plantCardEmoji}>{item.emoji}</Text>
              <Text style={styles.plantCardName}>{item.name}</Text>
              <Text style={styles.plantCardDays}>{item.growDays}天成熟</Text>
              <Text style={styles.plantCardDifficulty}>
                {item.difficulty === 'easy' ? '⭐' : item.difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item._id}
          scrollEnabled={false}
          columnWrapperStyle={styles.plantRow}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sectionDesc: { fontSize: 13, color: '#795548', marginTop: 2, marginBottom: 12 },
  emptyGarden: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 13, color: '#ccc', marginTop: 4 },
  plotCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  plotCardMature: { borderColor: '#FFD700', borderWidth: 2 },
  plotHeader: { flexDirection: 'row', alignItems: 'center' },
  plotEmoji: { fontSize: 40 },
  plotInfo: { marginLeft: 12, flex: 1 },
  plotName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  plotStatus: { fontSize: 13, color: '#795548', marginTop: 2 },
  progressBar: {
    height: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  progressText: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'right' },
  plotActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  waterButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  waterButtonText: { color: '#fff', fontWeight: 'bold' },
  sunshineButton: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  claimButtonText: { color: '#fff', fontWeight: 'bold' },
  checkInText: { fontSize: 11, color: '#999', marginTop: 8 },
  plantRow: { justifyContent: 'space-between' },
  plantCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  plantCardEmoji: { fontSize: 48 },
  plantCardName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 8 },
  plantCardDays: { fontSize: 12, color: '#795548', marginTop: 4 },
  plantCardDifficulty: { marginTop: 4 },
});
