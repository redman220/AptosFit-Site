import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface ProgressBarProps {
  value: number; // 0 to 1
  color?: string;
  height?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  color = COLORS.primary,
  height = 6,
  backgroundColor = COLORS.surfaceElevated,
  style,
}: ProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedValue = Math.min(Math.max(value, 0), 1);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedValue, widthAnim]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height,
          width: widthInterpolated,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
