import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function FitnessLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          color: COLORS.text,
        },
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerLargeTitleStyle: {
          fontFamily: 'SpaceGrotesk_700Bold',
          color: COLORS.text,
        },
        headerLargeStyle: { backgroundColor: COLORS.background },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
