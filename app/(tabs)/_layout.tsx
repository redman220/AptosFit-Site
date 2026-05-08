import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View } from 'react-native';
import { COLORS } from '@/constants/Colors';

const TABS = [
  {
    name: '(nutrition)',
    route: '/(tabs)/(nutrition)' as const,
    icon: 'restaurant' as const,
    label: 'Nutrition',
  },
  {
    name: '(fitness)',
    route: '/(tabs)/(fitness)' as const,
    icon: 'fitness-center' as const,
    label: 'Fitness',
  },
  {
    name: '(progress)',
    route: '/(tabs)/(progress)' as const,
    icon: 'trending-up' as const,
    label: 'Progress',
  },
  {
    name: '(community)',
    route: '/(tabs)/(community)' as const,
    icon: 'people' as const,
    label: 'Community',
  },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(nutrition)" />
        <Stack.Screen name="(fitness)" />
        <Stack.Screen name="(progress)" />
        <Stack.Screen name="(community)" />
      </Stack>
      <FloatingTabBar
        tabs={TABS}
        containerWidth={320}
        borderRadius={35}
        bottomMargin={20}
      />
    </View>
  );
}
