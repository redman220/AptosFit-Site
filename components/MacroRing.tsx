import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';

interface MacroRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function MacroRing({ consumed, goal, size = 200 }: MacroRingProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;

  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const cx = size / 2;
  const cy = size / 2;

  const consumedDisplay = Math.round(consumed).toLocaleString();
  const goalDisplay = Math.round(goal).toLocaleString();

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={COLORS.surfaceElevated}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '700',
            color: COLORS.primary,
            fontFamily: 'SpaceGrotesk_700Bold',
            letterSpacing: -1,
          }}
        >
          {consumedDisplay}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.textSecondary,
            fontFamily: 'SpaceGrotesk_400Regular',
            marginTop: 2,
          }}
        >
          of {goalDisplay} kcal
        </Text>
      </View>
    </View>
  );
}
