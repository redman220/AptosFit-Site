import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { COLORS } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <NativeTabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <NativeTabs.Trigger name="(nutrition)">
        <Icon sf="fork.knife" />
        <Label>Nutrition</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(fitness)">
        <Icon sf="dumbbell" />
        <Label>Fitness</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(progress)">
        <Icon sf="chart.line.uptrend.xyaxis" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(community)">
        <Icon sf="person.2" />
        <Label>Community</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
