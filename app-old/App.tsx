import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapScreen from './src/screens/MapScreen';
import HomeScreen from './src/screens/HomeScreen';
import GardenScreen from './src/screens/GardenScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              paddingBottom: 5,
              height: 60,
            },
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: '首页',
              tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
            }}
          />
          <Tab.Screen
            name="Map"
            component={MapScreen}
            options={{
              tabBarLabel: '地图买花',
              tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} />,
            }}
          />
          <Tab.Screen
            name="Garden"
            component={GardenScreen}
            options={{
              tabBarLabel: '我的花园',
              tabBarIcon: ({ color }) => <TabIcon emoji="🌻" color={color} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: '我的',
              tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 24 }}>{emoji}</Text>;
}
