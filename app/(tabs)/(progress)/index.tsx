import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Settings, Scale, TrendingUp, Plus, Activity } from 'lucide-react-native';
import Svg, { Line, Circle, Path, Text as SvgText, Rect } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { getProgress, getAptosScore } from '@/utils/api';
import type { ProgressData, AptosScoreResponse } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ProgressBar } from '@/components/ProgressBar';
import { SkeletonCard } from '@/components/SkeletonLoader';

function formatDateAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SCORE_LABEL_COLORS: Record<string, string> = {
  Legend: '#FFD700',
  Elite: COLORS.primary,
  Advanced: COLORS.accent,
  Consistent: COLORS.success,
  Building: COLORS.textSecondary,
  Beginner: COLORS.textTertiary,
};

function MultiplierBadge({ value }: { value: number }) {
  const badgeColor = value >= 1.2 ? COLORS.warning : value >= 1.0 ? COLORS.success : COLORS.textTertiary;
  const multiplierText = `×${Number(value).toFixed(1)}`;
  return (
    <View style={{
      backgroundColor: `${badgeColor}22`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    }}>
      <Text style={{ color: badgeColor, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 }}>
        {multiplierText}
      </Text>
    </View>
  );
}

interface AptosScoreCardProps {
  score: AptosScoreResponse;
}

function AptosScoreCard({ score }: AptosScoreCardProps) {
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scoreAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const scoreColor = SCORE_LABEL_COLORS[score.label] ?? COLORS.primary;
  const scoreProgress = score.score / 1000;
  const scoreText = String(score.score);
  const labelText = score.label;
  const calorieAdherenceText = `${Math.round(score.breakdown.calorie_adherence_pct)}% adherence`;
  const fitnessAdherenceText = `${Math.round(score.breakdown.fitness_adherence_pct)}% adherence`;
  const consistencyPctText = `${Math.round(score.breakdown.consistency_pct)}% of days`;
  const calorieScoreText = `${Math.round(score.breakdown.calorie_score)} pts`;
  const fitnessScoreText = `${Math.round(score.breakdown.fitness_score)} pts`;
  const consistencyScoreText = `${Math.round(score.breakdown.consistency_score)} pts`;

  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 20,
      gap: 16,
    }}>
      {/* Top row: score + label */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, marginBottom: 2 }}>
            Aptos Score
          </Text>
          <Animated.View style={{ opacity: scoreAnim, transform: [{ scale: scaleAnim }] }}>
            <Text style={{ color: scoreColor, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 72, lineHeight: 80 }}>
              {scoreText}
            </Text>
          </Animated.View>
        </View>
        <View style={{
          backgroundColor: COLORS.primaryMuted,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          marginBottom: 8,
        }}>
          <Text style={{ color: scoreColor, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
            {labelText}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <ProgressBar value={scoreProgress} height={6} />
      <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, textAlign: 'center', marginTop: -8 }}>
        Based on last 7 days
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: COLORS.divider }} />

      {/* Breakdown */}
      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
        Score Breakdown
      </Text>
      {[
        {
          emoji: '🍽',
          label: 'Nutrition',
          scoreText: calorieScoreText,
          adherenceText: calorieAdherenceText,
          multiplier: score.breakdown.calorie_ambition_multiplier,
        },
        {
          emoji: '💪',
          label: 'Fitness',
          scoreText: fitnessScoreText,
          adherenceText: fitnessAdherenceText,
          multiplier: score.breakdown.fitness_ambition_multiplier,
        },
        {
          emoji: '🔥',
          label: 'Consistency',
          scoreText: consistencyScoreText,
          adherenceText: consistencyPctText,
          multiplier: null,
        },
      ].map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
              {row.label}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {row.multiplier !== null && <MultiplierBadge value={row.multiplier} />}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 }}>
                {row.scoreText}
              </Text>
              <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                {row.adherenceText}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function AptosScoreEmptyCard() {
  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    }}>
      <TrendingUp size={20} color={COLORS.textTertiary} />
      <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, flex: 1 }}>
        Log meals and workouts to earn your Aptos Score
      </Text>
    </View>
  );
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

interface WeightChartProps {
  data: { date: string; weight_lbs: number }[];
  width: number;
}

function WeightChart({ data, width }: WeightChartProps) {
  if (data.length === 0) return null;
  const height = 140;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const weights = data.map(d => d.weight_lbs);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;
  const range = maxW - minW || 1;

  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.weight_lbs - minW) / range) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const yLabels = [minW, (minW + maxW) / 2, maxW].map(v => Math.round(v));

  return (
    <Svg width={width} height={height}>
      {/* Y axis labels */}
      {yLabels.map((v, i) => {
        const y = padT + chartH - (i / 2) * chartH;
        return (
          <SvgText key={i} x={padL - 6} y={y + 4} fontSize={10} fill={COLORS.textTertiary} textAnchor="end">
            {v}
          </SvgText>
        );
      })}
      {/* Grid lines */}
      {yLabels.map((_, i) => {
        const y = padT + chartH - (i / 2) * chartH;
        return (
          <Line key={i} x1={padL} y1={y} x2={padL + chartW} y2={y} stroke={COLORS.border} strokeWidth={1} />
        );
      })}
      {/* Line */}
      <Path d={pathD} stroke={COLORS.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={COLORS.primary} />
      ))}
      {/* X axis labels — every 7th */}
      {data.map((d, i) => {
        if (i % 7 !== 0 && i !== data.length - 1) return null;
        return (
          <SvgText key={i} x={points[i].x} y={height - 4} fontSize={9} fill={COLORS.textTertiary} textAnchor="middle">
            {shortDate(d.date)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

interface CalorieTrendChartProps {
  data: { date: string; calories_consumed: number; calories_burned: number }[];
  width: number;
}

function CalorieTrendChart({ data, width }: CalorieTrendChartProps) {
  if (data.length === 0) return null;
  const height = 140;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const allVals = data.flatMap(d => [d.calories_consumed, d.calories_burned]);
  const minV = 0;
  const maxV = Math.max(...allVals, 100);
  const range = maxV - minV || 1;

  const consumedPoints = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.calories_consumed - minV) / range) * chartH,
  }));
  const burnedPoints = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.calories_burned - minV) / range) * chartH,
  }));

  const consumedPath = consumedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const burnedPath = burnedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const yLabels = [0, Math.round(maxV / 2), Math.round(maxV)];

  return (
    <Svg width={width} height={height}>
      {yLabels.map((v, i) => {
        const y = padT + chartH - (i / 2) * chartH;
        return (
          <React.Fragment key={i}>
            <SvgText x={padL - 6} y={y + 4} fontSize={10} fill={COLORS.textTertiary} textAnchor="end">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            </SvgText>
            <Line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke={COLORS.border} strokeWidth={1} />
          </React.Fragment>
        );
      })}
      <Path d={consumedPath} stroke={COLORS.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={burnedPath} stroke={COLORS.accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((_, i) => {
        if (i % 7 !== 0 && i !== data.length - 1) return null;
        return (
          <SvgText key={i} x={consumedPoints[i].x} y={height - 4} fontSize={9} fill={COLORS.textTertiary} textAnchor="middle">
            {shortDate(data[i].date)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

interface ActivityBarChartProps {
  data: { date: string; exercise_count: number }[];
  width: number;
}

function ActivityBarChart({ data, width }: ActivityBarChartProps) {
  if (data.length === 0) return null;
  const height = 100;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 24;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxCount = Math.max(...data.map(d => d.exercise_count), 1);
  const barWidth = chartW / data.length - 3;

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barH = (d.exercise_count / maxCount) * chartH;
        const x = padL + i * (chartW / data.length) + 1.5;
        const y = padT + chartH - barH;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 2)}
              rx={3}
              fill={d.exercise_count > 0 ? COLORS.primary : COLORS.surfaceElevated}
            />
            {i % 3 === 0 && (
              <SvgText x={x + barWidth / 2} y={height - 4} fontSize={8} fill={COLORS.textTertiary} textAnchor="middle">
                {shortDate(d.date).split(' ')[1]}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { userId, profile } = useUser();
  const { width: screenWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [aptosScore, setAptosScore] = useState<AptosScoreResponse | null>(null);
  const [aptosScoreLoading, setAptosScoreLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const chartWidth = screenWidth - 32 - 32; // screen padding + card padding

  const goalLiftingVolume = profile?.goal_lifting_volume_lbs ?? 5000;
  const goalCardioMinutes = profile?.goal_cardio_minutes ?? 150;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    console.log('[Progress] Fetching progress data and Aptos Score for user:', userId);
    setLoading(true);
    setAptosScoreLoading(true);
    setError(null);
    const [progressResult, scoreResult] = await Promise.allSettled([
      getProgress(userId, 30),
      getAptosScore(userId),
    ]);
    if (progressResult.status === 'fulfilled') {
      const data = progressResult.value;
      setProgressData(data);
      console.log('[Progress] Loaded progress data:', {
        weightEntries: data.weight_trend.length,
        calorieEntries: data.calorie_trend.length,
        activityEntries: data.activity_trend.length,
      });
    } else {
      console.error('[Progress] Fetch error:', progressResult.reason);
      setError('Could not load progress data. Check your connection and try again.');
    }
    if (scoreResult.status === 'fulfilled') {
      console.log('[Progress] Loaded Aptos Score:', scoreResult.value.score, scoreResult.value.label);
      setAptosScore(scoreResult.value);
    } else {
      console.warn('[Progress] Aptos Score fetch failed:', scoreResult.reason);
      setAptosScore(null);
    }
    setLoading(false);
    setAptosScoreLoading(false);
  }, [userId, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const weightTrend = progressData?.weight_trend ?? [];
  const calorieTrend = progressData?.calorie_trend ?? [];
  const activityTrend = progressData?.activity_trend?.slice(-14) ?? [];
  const weeklyLiftingVolume = progressData?.weekly_lifting_volume ?? 0;
  const weeklyCardioMinutes = progressData?.weekly_cardio_minutes ?? 0;

  const currentWeight = weightTrend.length > 0 ? weightTrend[weightTrend.length - 1].weight_lbs : null;
  const firstWeight = weightTrend.length > 1 ? weightTrend[0].weight_lbs : null;
  const weightChange = currentWeight !== null && firstWeight !== null ? currentWeight - firstWeight : null;
  const weightChangeText = weightChange !== null
    ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`
    : null;
  const weightChangeColor = weightChange !== null
    ? (weightChange <= 0 ? COLORS.success : COLORS.danger)
    : COLORS.textSecondary;

  const liftingProgress = goalLiftingVolume > 0 ? weeklyLiftingVolume / goalLiftingVolume : 0;
  const cardioProgress = goalCardioMinutes > 0 ? weeklyCardioMinutes / goalCardioMinutes : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Progress',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Progress] Open add weight sheet');
                  router.push('/add-weight');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: COLORS.primaryMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Plus size={14} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 }}>
                  Weight
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Progress] Navigate to settings');
                  router.push('/settings');
                }}
                style={{ padding: 8 }}
              >
                <Settings size={22} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
            <TrendingUp size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, textAlign: 'center' }}>
              Couldn't load progress data
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Progress] Retry fetch');
                setRefreshKey(k => k + 1);
              }}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>Try again</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            {/* Aptos Score Hero Card */}
            <AnimatedListItem index={0}>
              {aptosScoreLoading ? (
                <SkeletonCard />
              ) : aptosScore ? (
                <AptosScoreCard score={aptosScore} />
              ) : (
                <AptosScoreEmptyCard />
              )}
            </AnimatedListItem>

            {/* Weight Chart */}
            <AnimatedListItem index={1}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>Weight</Text>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, marginTop: 2 }}>Last 30 days</Text>
                  </View>
                  {currentWeight !== null && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 }}>
                        {currentWeight.toFixed(1)}
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }}> lbs</Text>
                      </Text>
                      {weightChangeText && (
                        <Text style={{ color: weightChangeColor, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                          {weightChangeText}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                {weightTrend.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                    <View style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Scale size={24} color={COLORS.primary} />
                    </View>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center' }}>
                      No weight entries yet
                    </Text>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[Progress] Log first weight CTA');
                        router.push('/add-weight');
                      }}
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 }}>
                        Log your first weight
                      </Text>
                    </AnimatedPressable>
                  </View>
                ) : (
                  <WeightChart data={weightTrend} width={chartWidth} />
                )}
              </View>
            </AnimatedListItem>

            {/* Calorie Trend */}
            <AnimatedListItem index={2}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
              }}>
                <View>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>Calories</Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, marginTop: 2 }}>Last 30 days</Text>
                </View>
                {calorieTrend.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
                      No calorie data yet
                    </Text>
                  </View>
                ) : (
                  <>
                    <CalorieTrendChart data={calorieTrend} width={chartWidth} />
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 3, backgroundColor: COLORS.primary, borderRadius: 2 }} />
                        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>Consumed</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 12, height: 3, backgroundColor: COLORS.accent, borderRadius: 2 }} />
                        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>Burned</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </AnimatedListItem>

            {/* Weekly Goals */}
            <AnimatedListItem index={3}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 16,
              }}>
                <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>
                  This Week's Goals
                </Text>
                {[
                  {
                    label: 'Lifting Volume',
                    value: Math.round(weeklyLiftingVolume).toLocaleString(),
                    goal: Math.round(goalLiftingVolume).toLocaleString(),
                    unit: 'lbs',
                    progress: liftingProgress,
                  },
                  {
                    label: 'Cardio',
                    value: Math.round(weeklyCardioMinutes).toLocaleString(),
                    goal: Math.round(goalCardioMinutes).toLocaleString(),
                    unit: 'min',
                    progress: cardioProgress,
                  },
                ].map((goal) => {
                  const goalProgressText = `${goal.value} / ${goal.goal} ${goal.unit}`;
                  return (
                    <View key={goal.label} style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
                          {goal.label}
                        </Text>
                        <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                          {goalProgressText}
                        </Text>
                      </View>
                      <ProgressBar value={goal.progress} height={8} />
                    </View>
                  );
                })}
              </View>
            </AnimatedListItem>

            {/* Activity Trend */}
            <AnimatedListItem index={4}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color={COLORS.primary} />
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>Activity</Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>— last 14 days</Text>
                </View>
                {activityTrend.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
                      No activity data yet
                    </Text>
                  </View>
                ) : (
                  <ActivityBarChart data={activityTrend} width={chartWidth} />
                )}
              </View>
            </AnimatedListItem>
          </>
        )}
      </ScrollView>
    </>
  );
}
