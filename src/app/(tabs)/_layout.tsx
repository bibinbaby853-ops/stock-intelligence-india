import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

const tabs: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'screener', title: 'Screener', icon: 'funnel-outline' },
  { name: 'discover', title: 'Discover', icon: 'compass-outline' },
  { name: 'watchlist', title: 'Watchlist', icon: 'bookmark-outline' },
  { name: 'profile', title: 'Profile', icon: 'person-outline' },
];

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, height: 62 + insets.bottom, paddingTop: 6, paddingBottom: 6 + insets.bottom },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={color as string} /> }} />
      ))}
    </Tabs>
  );
}
