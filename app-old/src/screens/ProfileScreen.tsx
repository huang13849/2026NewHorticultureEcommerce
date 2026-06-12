import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { API } from '../services/api';
import { useUserStore } from '../store/userStore';

export default function ProfileScreen() {
  const { user, token, setUser, setToken, clearUser } = useUserStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 地址编辑
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', phone: '', province: '', city: '', district: '', detail: '',
  });

  const handleLogin = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      const result = await API.login(phone, code || '123456', {
        platform: 'app',
        deviceId: 'mobile-app',
      });
      setToken(result.token);
      setUser(result.user);
    } catch (e) {
      Alert.alert('登录失败', e.message || '请检查手机号和验证码');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('请输入正确的手机号');
      return;
    }
    try {
      await API.sendCode(phone);
      Alert.alert('验证码已发送', '开发环境验证码: 123456');
    } catch (e) {
      Alert.alert('发送失败', e.message);
    }
  };

  const handleAddAddress = async () => {
    try {
      await API.updateAddress(addressForm);
      Alert.alert('地址已保存');
      setShowAddressForm(false);
      // 刷新用户信息
      const updated = await API.getProfile();
      setUser(updated);
    } catch (e) {
      Alert.alert('保存失败', e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: clearUser },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.logo}>🌸</Text>
        <Text style={styles.appName}>花伴</Text>
        <Text style={styles.slogan}>让每一朵花找到它的主人</Text>

        <TextInput
          style={styles.input}
          placeholder="请输入手机号"
          keyboardType="phone-pad"
          maxLength={11}
          value={phone}
          onChangeText={setPhone}
        />
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="验证码"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.codeButton} onPress={handleSendCode}>
            <Text style={styles.codeButtonText}>获取验证码</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>
            {loading ? '登录中...' : '登录 / 注册'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 用户信息 */}
      <View style={styles.profileHeader}>
        <Text style={styles.avatar}>{user.avatar || '🌸'}</Text>
        <View style={styles.profileInfo}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.phoneText}>{user.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</Text>
        </View>
      </View>

      {/* 统计 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{user.gardenStats?.totalPlanted || 0}</Text>
          <Text style={styles.statLabel}>已种植</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{user.gardenStats?.totalCompleted || 0}</Text>
          <Text style={styles.statLabel}>已成熟</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{user.gardenStats?.totalGifted || 0}</Text>
          <Text style={styles.statLabel}>已获赠</Text>
        </View>
      </View>

      {/* 收货地址 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 收货地址</Text>
          <TouchableOpacity onPress={() => setShowAddressForm(!showAddressForm)}>
            <Text style={styles.addBtn}>+ 新增</Text>
          </TouchableOpacity>
        </View>

        {showAddressForm && (
          <View style={styles.addressForm}>
            <TextInput style={styles.input} placeholder="姓名" value={addressForm.name}
              onChangeText={t => setAddressForm({ ...addressForm, name: t })} />
            <TextInput style={styles.input} placeholder="手机号" keyboardType="phone-pad" value={addressForm.phone}
              onChangeText={t => setAddressForm({ ...addressForm, phone: t })} />
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="省" value={addressForm.province}
                onChangeText={t => setAddressForm({ ...addressForm, province: t })} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="市" value={addressForm.city}
                onChangeText={t => setAddressForm({ ...addressForm, city: t })} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="区" value={addressForm.district}
                onChangeText={t => setAddressForm({ ...addressForm, district: t })} />
            </View>
            <TextInput style={styles.input} placeholder="详细地址" value={addressForm.detail}
              onChangeText={t => setAddressForm({ ...addressForm, detail: t })} />
            <TouchableOpacity style={styles.saveButton} onPress={handleAddAddress}>
              <Text style={styles.saveButtonText}>保存地址</Text>
            </TouchableOpacity>
          </View>
        )}

        {user.address?.map((addr, idx) => (
          <View key={idx} style={styles.addressCard}>
            <Text style={styles.addressName}>{addr.name} {addr.phone}</Text>
            <Text style={styles.addressDetail}>{addr.province}{addr.city}{addr.district}{addr.detail}</Text>
            {addr.isDefault && <Text style={styles.defaultTag}>默认</Text>}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  logo: { fontSize: 64 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginTop: 8 },
  slogan: { fontSize: 14, color: '#999', marginTop: 4 },
  input: {
    width: '100%', height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 16, marginTop: 12, fontSize: 16,
  },
  codeRow: { flexDirection: 'row', width: '100%' },
  codeButton: { justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
  codeButtonText: { color: '#4CAF50', fontWeight: 'bold' },
  loginButton: {
    width: '100%', height: 48, backgroundColor: '#4CAF50', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#4CAF50' },
  avatar: { fontSize: 48 },
  profileInfo: { marginLeft: 16 },
  nickname: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  phoneText: { fontSize: 14, color: '#E8F5E9', marginTop: 2 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, justifyContent: 'space-around',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  addBtn: { color: '#4CAF50', fontWeight: 'bold' },
  addressForm: { marginTop: 12 },
  addressRow: { flexDirection: 'row', gap: 8 },
  saveButton: { backgroundColor: '#4CAF50', height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  addressCard: { padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, marginTop: 8 },
  addressName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  addressDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  defaultTag: { color: '#FF9800', fontSize: 11, marginTop: 4 },
  logoutButton: { marginTop: 24, marginHorizontal: 16, marginBottom: 40, padding: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 8 },
  logoutText: { color: '#E53935', fontSize: 16 },
});
