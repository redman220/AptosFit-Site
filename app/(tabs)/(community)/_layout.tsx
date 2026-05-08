import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          color: COLORS.text,
        },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
