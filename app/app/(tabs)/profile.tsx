import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { API } from '../../services/api';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async () => {
    if (!phone || phone.length < 11) {
      Alert.alert('请输入手机号');
      return;
    }
    try {
      const data = await API.login(phone, code || '123456');
      setUser(data.user);
      setLoggedIn(true);
      Alert.alert('登录成功', `欢迎 ${data.user.nickname}！`);
    } catch (e) {
      Alert.alert('登录失败', '请检查手机号和验证码');
    }
  };

  if (!loggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.logo}>🌸</Text>
        <Text style={styles.appName}>花伴</Text>
        <Text style={styles.appDesc}>让每一朵花找到它的主人</Text>

        <TextInput
          style={styles.input}
          placeholder="手机号"
          keyboardType="phone-pad"
          maxLength={11}
          value={phone}
          onChangeText={setPhone}
        />
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="验证码"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.codeBtn}>
            <Text style={styles.codeBtnText}>获取验证码</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnText}>登录</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>验证码输入 123456 即可登录</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.avatar}>{user?.avatar || '🌸'}</Text>
        <Text style={styles.nickname}>{user?.nickname || '花友'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>收货地址</Text>
        {(user?.address || []).length === 0 ? (
          <Text style={styles.emptyText}>暂无收货地址</Text>
        ) : (
          user.address.map((addr, i) => (
            <View key={i} style={styles.addressCard}>
              <Text style={styles.addressName}>{addr.name} {addr.phone}</Text>
              <Text style={styles.addressDetail}>
                {addr.province}{addr.city}{addr.district}{addr.detail}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>种花成就</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{user?.gardenStats?.totalPlanted || 0}</Text>
            <Text style={styles.statLabel}>已种植</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{user?.gardenStats?.totalCompleted || 0}</Text>
            <Text style={styles.statLabel}>已成熟</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{user?.gardenStats?.totalGifted || 0}</Text>
            <Text style={styles.statLabel}>已获赠</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => { setLoggedIn(false); setUser(null); }}
      >
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logo: { fontSize: 64 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', marginTop: 12 },
  appDesc: { fontSize: 14, color: '#795548', marginTop: 4 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginTop: 12,
  },
  codeRow: { flexDirection: 'row', width: '100%', gap: 8, marginTop: 12 },
  codeBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  codeBtnText: { color: '#fff', fontSize: 13 },
  loginBtn: {
    width: '100%',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  hint: { fontSize: 12, color: '#999', marginTop: 12 },
  header: {
    backgroundColor: '#4CAF50',
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: { fontSize: 48 },
  nickname: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  phone: { fontSize: 14, color: '#E8F5E9', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', padding: 16 },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  addressName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  addressDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, flex: 1, marginHorizontal: 4 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  logoutBtn: { margin: 16, padding: 14, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center' },
  logoutText: { color: '#E53935', fontSize: 16 },
});
