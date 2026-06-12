import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
        },
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '🌸 首页',
          tabBarLabel: '首页',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '🗺️ 地图买花',
          tabBarLabel: '地图',
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: '🌱 每日种花',
          tabBarLabel: '花园',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '👤 我的',
          tabBarLabel: '我的',
        }}
      />
    </Tabs>
  );
}
