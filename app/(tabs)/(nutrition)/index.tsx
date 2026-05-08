import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Settings, Calendar, UtensilsCrossed, Flame, Trash2, Plus, Share2 } from 'lucide-react-native';
import DatePicker from '@/components/DatePicker';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { listFoodLogs, listExerciseLogs, deleteFoodLog } from '@/utils/api';
import type { FoodLog, MacroTotals } from '@/utils/api';
import { MacroRing } from '@/components/MacroRing';
import { ProgressBar } from '@/components/ProgressBar';
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

const MEAL_ORDER: FoodLog['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<FoodLog['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
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

export default function NutritionScreen() {
  const router = useRouter();
  const { userId, profile } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [totals, setTotals] = useState<MacroTotals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const goalCalories = profile?.goal_calories ?? 2000;
  const goalProtein = profile?.goal_protein_g ?? 150;
  const goalCarbs = profile?.goal_carbs_g ?? 200;
  const goalFat = profile?.goal_fat_g ?? 65;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const dateStr = formatDateAPI(selectedDate);
    console.log('[Nutrition] Fetching data for date:', dateStr);
    setLoading(true);
    setError(null);
    try {
      const [foodData, exerciseData] = await Promise.all([
        listFoodLogs(userId, dateStr),
        listExerciseLogs(userId, dateStr),
      ]);
      setFoodLogs(foodData.logs);
      setTotals(foodData.totals);
      setCaloriesBurned(exerciseData.total_calories_burned ?? 0);
      setExerciseCount(exerciseData.logs.length);
      console.log('[Nutrition] Loaded', foodData.logs.length, 'food logs,', exerciseData.logs.length, 'exercises');
    } catch (e) {
      console.error('[Nutrition] Fetch error:', e);
      setError('Could not load nutrition data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleDeleteFood = async (id: string, name: string) => {
    console.log('[Nutrition] Delete food log:', id, name);
    Alert.alert('Delete meal?', `Remove "${name}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await deleteFoodLog(id);
            setFoodLogs(prev => prev.filter(f => f.id !== id));
            const deleted = foodLogs.find(f => f.id === id);
            if (deleted) {
              setTotals(prev => ({
                calories: Math.max(0, prev.calories - deleted.calories),
                protein_g: Math.max(0, prev.protein_g - deleted.protein_g),
                carbs_g: Math.max(0, prev.carbs_g - deleted.carbs_g),
                fat_g: Math.max(0, prev.fat_g - deleted.fat_g),
              }));
            }
            console.log('[Nutrition] Food log deleted:', id);
          } catch (e) {
            console.error('[Nutrition] Delete error:', e);
            Alert.alert('Error', 'Could not delete meal. Please try again.');
          }
        },
      },
    ]);
  };

  const netCalories = totals.calories - caloriesBurned;
  const remaining = goalCalories - netCalories;
  const remainingText = remaining >= 0 ? `${Math.round(remaining).toLocaleString()} kcal remaining` : `${Math.abs(Math.round(remaining)).toLocaleString()} kcal over`;
  const remainingColor = remaining >= 0 ? COLORS.success : COLORS.danger;

  const groupedMeals = MEAL_ORDER.reduce((acc, type) => {
    acc[type] = foodLogs.filter(f => f.meal_type === type);
    return acc;
  }, {} as Record<FoodLog['meal_type'], FoodLog[]>);

  const dateDisplay = formatDateDisplay(selectedDate);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nutrition',
          headerLeft: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[Nutrition] Open date picker');
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
                  console.log('[Nutrition] Open share post sheet');
                  router.push({ pathname: '/share-post', params: { post_type: 'meal' } });
                }}
                style={{ padding: 8 }}
              >
                <Share2 size={22} color={COLORS.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Nutrition] Navigate to settings');
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
              console.log('[Nutrition] Date changed to:', formatDateAPI(date));
              setSelectedDate(date);
            }
          }}
        />
      )}

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
                <SkeletonCard />
              </View>
            </View>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
            <UtensilsCrossed size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, textAlign: 'center' }}>
              Couldn't load nutrition data
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Nutrition] Retry fetch');
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
            {/* Calorie Ring */}
            <AnimatedListItem index={0}>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <MacroRing consumed={netCalories} goal={goalCalories} size={200} />
                <Text style={{
                  marginTop: 12,
                  fontSize: 15,
                  fontFamily: 'SpaceGrotesk_500Medium',
                  color: remainingColor,
                }}>
                  {remainingText}
                </Text>
                {caloriesBurned > 0 && (
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4 }}>
                    {Math.round(totals.calories).toLocaleString()} eaten − {Math.round(caloriesBurned).toLocaleString()} burned
                  </Text>
                )}
              </View>
            </AnimatedListItem>

            {/* Macro Progress */}
            <AnimatedListItem index={1}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 14,
              }}>
                <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>
                  Macros
                </Text>
                {[
                  { label: 'Protein', value: totals.protein_g, goal: goalProtein, color: '#4FC3F7' },
                  { label: 'Carbs', value: totals.carbs_g, goal: goalCarbs, color: '#FFB74D' },
                  { label: 'Fat', value: totals.fat_g, goal: goalFat, color: COLORS.primary },
                ].map((macro) => {
                  const macroProgress = macro.goal > 0 ? macro.value / macro.goal : 0;
                  const macroValueText = `${Math.round(macro.value)}g`;
                  const macroGoalText = `${macro.goal}g`;
                  return (
                    <View key={macro.label} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
                          {macro.label}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                            {macroValueText}
                          </Text>
                          <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                            /
                          </Text>
                          <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                            {macroGoalText}
                          </Text>
                        </View>
                      </View>
                      <ProgressBar value={macroProgress} color={macro.color} height={6} />
                    </View>
                  );
                })}
              </View>
            </AnimatedListItem>

            {/* Calories Burned */}
            {caloriesBurned > 0 && (
              <AnimatedListItem index={2}>
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 14,
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
                    backgroundColor: 'rgba(255,112,67,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Flame size={20} color={COLORS.accent} />
                  </View>
                  <View>
                    <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>
                      {Math.round(caloriesBurned).toLocaleString()} kcal burned
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                      from {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </AnimatedListItem>
            )}

            {/* Today's Meals */}
            <AnimatedListItem index={3}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
                  Today's Meals
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Nutrition] Open add meal sheet');
                    router.push('/add-meal');
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
                    Add meal
                  </Text>
                </AnimatedPressable>
              </View>
            </AnimatedListItem>

            {foodLogs.length === 0 ? (
              <AnimatedListItem index={4}>
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
                    <UtensilsCrossed size={28} color={COLORS.primary} />
                  </View>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>
                    No meals logged yet
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 240 }}>
                    Track your food intake to see your daily nutrition breakdown
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Nutrition] Log first meal CTA');
                      router.push('/add-meal');
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
                      Log your first meal
                    </Text>
                  </AnimatedPressable>
                </View>
              </AnimatedListItem>
            ) : (
              MEAL_ORDER.map((mealType, mealIdx) => {
                const meals = groupedMeals[mealType];
                if (meals.length === 0) return null;
                return (
                  <AnimatedListItem key={mealType} index={4 + mealIdx}>
                    <View style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.divider,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>
                          {MEAL_LABELS[mealType]}
                        </Text>
                        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                          {meals.reduce((s, m) => s + m.calories, 0).toLocaleString()} kcal
                        </Text>
                      </View>
                      {meals.map((food, foodIdx) => {
                        const macroLine = `${Math.round(food.protein_g)}g P · ${Math.round(food.carbs_g)}g C · ${Math.round(food.fat_g)}g F`;
                        const calText = `${Math.round(food.calories).toLocaleString()} kcal`;
                        return (
                          <View
                            key={food.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderBottomWidth: foodIdx < meals.length - 1 ? 1 : 0,
                              borderBottomColor: COLORS.divider,
                            }}
                          >
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                                {food.food_name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                                  {calText}
                                </Text>
                                <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>·</Text>
                                <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                                  {macroLine}
                                </Text>
                              </View>
                            </View>
                            <AnimatedPressable
                              onPress={() => handleDeleteFood(food.id, food.food_name)}
                              style={{ padding: 8 }}
                            >
                              <Trash2 size={16} color={COLORS.textTertiary} />
                            </AnimatedPressable>
                          </View>
                        );
                      })}
                    </View>
                  </AnimatedListItem>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}
