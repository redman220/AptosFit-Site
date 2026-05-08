import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Settings, Calendar, Dumbbell, Flame, Trash2, Plus, Info, X, Share2 } from 'lucide-react-native';
import DatePicker from '@/components/DatePicker';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { listExerciseLogs, deleteExerciseLog } from '@/utils/api';
import type { ExerciseLog } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDateDisplay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TYPE_COLORS: Record<ExerciseLog['exercise_type'], string> = {
  strength: COLORS.primary,
  cardio: COLORS.accent,
  hiit: COLORS.warning,
  flexibility: '#4FC3F7',
  other: COLORS.textSecondary,
};

const TYPE_LABELS: Record<ExerciseLog['exercise_type'], string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  hiit: 'HIIT',
  flexibility: 'Flexibility',
  other: 'Other',
};

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function FitnessScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWearableModal, setShowWearableModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const dateStr = formatDateAPI(selectedDate);
    console.log('[Fitness] Fetching exercises for date:', dateStr);
    setLoading(true);
    setError(null);
    try {
      const data = await listExerciseLogs(userId, dateStr);
      setExercises(data.logs);
      setTotalCaloriesBurned(data.total_calories_burned ?? 0);
      console.log('[Fitness] Loaded', data.logs.length, 'exercises');
    } catch (e) {
      console.error('[Fitness] Fetch error:', e);
      setError('Could not load exercise data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleDelete = async (id: string, name: string) => {
    console.log('[Fitness] Delete exercise:', id, name);
    Alert.alert('Delete exercise?', `Remove "${name}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await deleteExerciseLog(id);
            const deleted = exercises.find(e => e.id === id);
            setExercises(prev => prev.filter(e => e.id !== id));
            if (deleted?.calories_burned) {
              setTotalCaloriesBurned(prev => Math.max(0, prev - (deleted.calories_burned ?? 0)));
            }
            console.log('[Fitness] Exercise deleted:', id);
          } catch (e) {
            console.error('[Fitness] Delete error:', e);
            Alert.alert('Error', 'Could not delete exercise. Please try again.');
          }
        },
      },
    ]);
  };

  const totalVolume = exercises
    .filter(e => e.exercise_type === 'strength' && e.sets && e.reps && e.weight_lbs)
    .reduce((sum, e) => sum + (e.sets ?? 0) * (e.reps ?? 0) * (e.weight_lbs ?? 0), 0);

  const dateDisplay = formatDateDisplay(selectedDate);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fitness',
          headerLeft: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[Fitness] Open date picker');
                setShowDatePicker(true);
              }}
              style={{ padding: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
                  {dateDisplay}
                </Text>
              </View>
            </AnimatedPressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Fitness] Open share post sheet');
                  router.push({ pathname: '/share-post', params: { post_type: 'workout' } });
                }}
                style={{ padding: 8 }}
              >
                <Share2 size={22} color={COLORS.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Fitness] Navigate to settings');
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

      {showDatePicker && (
        <DatePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) {
              console.log('[Fitness] Date changed to:', formatDateAPI(date));
              setSelectedDate(date);
            }
          }}
        />
      )}

      {/* Wearable Modal */}
      <Modal
        visible={showWearableModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWearableModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{
            backgroundColor: COLORS.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            gap: 16,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20 }}>
                Wearable Integration
              </Text>
              <AnimatedPressable onPress={() => setShowWearableModal(false)} style={{ padding: 4 }}>
                <X size={22} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, lineHeight: 22 }}>
              Apple Health and Fitbit integration is coming soon. For now, enter your calories burned manually when logging exercises.
            </Text>
            <AnimatedPressable
              onPress={() => setShowWearableModal(false)}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>Got it</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

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
            <Dumbbell size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, textAlign: 'center' }}>
              Couldn't load exercise data
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Fitness] Retry fetch');
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
            {/* Summary Card */}
            {exercises.length > 0 && (
              <AnimatedListItem index={0}>
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  gap: 0,
                }}>
                  {[
                    { label: 'Calories burned', value: `${Math.round(totalCaloriesBurned).toLocaleString()}`, unit: 'kcal' },
                    { label: 'Exercises', value: String(exercises.length), unit: '' },
                    ...(totalVolume > 0 ? [{ label: 'Volume', value: Math.round(totalVolume).toLocaleString(), unit: 'lbs' }] : []),
                  ].map((stat, i, arr) => (
                    <View
                      key={stat.label}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        borderRightWidth: i < arr.length - 1 ? 1 : 0,
                        borderRightColor: COLORS.border,
                        paddingVertical: 4,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                        <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 }}>
                          {stat.value}
                        </Text>
                        {stat.unit ? (
                          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                            {stat.unit}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, marginTop: 2 }}>
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </AnimatedListItem>
            )}

            {/* Exercise Log Header */}
            <AnimatedListItem index={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
                  Today's Exercises
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Fitness] Open add exercise sheet');
                    router.push('/add-exercise');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: COLORS.primaryMuted,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Plus size={14} color={COLORS.primary} />
                  <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 }}>
                    Add exercise
                  </Text>
                </AnimatedPressable>
              </View>
            </AnimatedListItem>

            {exercises.length === 0 ? (
              <AnimatedListItem index={2}>
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 32,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Dumbbell size={28} color={COLORS.primary} />
                  </View>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>
                    No exercises logged
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 240 }}>
                    Start tracking your workout to see your fitness progress
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Fitness] Log first exercise CTA');
                      router.push('/add-exercise');
                    }}
                    style={{
                      backgroundColor: COLORS.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 12,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                      Start tracking your workout
                    </Text>
                  </AnimatedPressable>
                </View>
              </AnimatedListItem>
            ) : (
              exercises.map((ex, idx) => {
                const typeColor = TYPE_COLORS[ex.exercise_type];
                const typeLabel = TYPE_LABELS[ex.exercise_type];
                const isStrength = ex.exercise_type === 'strength';
                const isCardio = ex.exercise_type === 'cardio' || ex.exercise_type === 'hiit';
                const detailLine = isStrength && ex.sets && ex.reps
                  ? `${ex.sets} sets × ${ex.reps} reps${ex.weight_lbs ? ` @ ${ex.weight_lbs} lbs` : ''}`
                  : isCardio
                  ? [
                      ex.duration_minutes ? `${ex.duration_minutes} min` : null,
                      ex.distance_miles ? `${ex.distance_miles} mi` : null,
                      ex.calories_burned ? `${Math.round(ex.calories_burned)} kcal` : null,
                    ].filter(Boolean).join(' · ')
                  : [
                      ex.duration_minutes ? `${ex.duration_minutes} min` : null,
                      ex.calories_burned ? `${Math.round(ex.calories_burned)} kcal` : null,
                    ].filter(Boolean).join(' · ');

                return (
                  <AnimatedListItem key={ex.id} index={2 + idx}>
                    <View style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }} numberOfLines={1}>
                            {ex.exercise_name}
                          </Text>
                          <View style={{
                            backgroundColor: `${typeColor}20`,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text style={{ color: typeColor, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 }}>
                              {typeLabel}
                            </Text>
                          </View>
                        </View>
                        {detailLine ? (
                          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                            {detailLine}
                          </Text>
                        ) : null}
                        {ex.notes ? (
                          <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={1}>
                            {ex.notes}
                          </Text>
                        ) : null}
                      </View>
                      <AnimatedPressable
                        onPress={() => handleDelete(ex.id, ex.exercise_name)}
                        style={{ padding: 8 }}
                      >
                        <Trash2 size={16} color={COLORS.textTertiary} />
                      </AnimatedPressable>
                    </View>
                  </AnimatedListItem>
                );
              })
            )}

            {/* Wearable Integration Card */}
            <AnimatedListItem index={exercises.length + 3}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Fitness] Open wearable info modal');
                  setShowWearableModal(true);
                }}
              >
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: 'rgba(79,195,247,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Info size={20} color="#4FC3F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                      Connect Apple Health or Fitbit
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, marginTop: 2 }}>
                      Tap to learn more about wearable integration
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>
            </AnimatedListItem>
          </>
        )}
      </ScrollView>
    </>
  );
}
