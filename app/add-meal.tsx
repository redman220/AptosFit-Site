import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { createFoodLog } from '@/utils/api';
import type { FoodLog } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const MEAL_TYPES: { value: FoodLog['meal_type']; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function formatDateAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  unit?: string;
  required?: boolean;
}

function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', unit, required }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
          {label}
        </Text>
        {required && (
          <Text style={{ color: COLORS.primary, fontSize: 13 }}>*</Text>
        )}
      </View>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: focused ? COLORS.primary : COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: COLORS.text,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontSize: 15,
            padding: 0,
          }}
        />
        {unit && (
          <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AddMealScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [mealType, setMealType] = useState<FoodLog['meal_type']>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!userId) return;
    if (!foodName.trim()) {
      Alert.alert('Missing food name', 'Please enter the food name.');
      return;
    }
    if (!calories || Number(calories) <= 0) {
      Alert.alert('Missing calories', 'Please enter the calorie count.');
      return;
    }
    console.log('[AddMeal] Logging meal:', { foodName, mealType, calories });
    setSaving(true);
    try {
      await createFoodLog({
        user_id: userId,
        date: formatDateAPI(new Date()),
        meal_type: mealType,
        food_name: foodName.trim(),
        calories: Number(calories),
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
      });
      console.log('[AddMeal] Meal logged successfully');
      router.back();
    } catch (e) {
      console.error('[AddMeal] Error logging meal:', e);
      Alert.alert('Error', 'Could not log meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Log Meal' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Meal Type Selector */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Meal type
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MEAL_TYPES.map((type) => {
                const isSelected = mealType === type.value;
                return (
                  <AnimatedPressable
                    key={type.value}
                    onPress={() => {
                      console.log('[AddMeal] Meal type selected:', type.value);
                      setMealType(type.value);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      color: isSelected ? '#fff' : COLORS.textSecondary,
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 12,
                    }}>
                      {type.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <InputField
            label="Food name"
            value={foodName}
            onChangeText={setFoodName}
            placeholder="e.g. Grilled chicken breast"
            required
          />

          <InputField
            label="Calories"
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            keyboardType="numeric"
            unit="kcal"
            required
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <InputField label="Protein" value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" unit="g" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Carbs" value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" unit="g" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Fat" value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" unit="g" />
            </View>
          </View>

          <AnimatedPressable
            onPress={() => {
              console.log('[AddMeal] Log meal button pressed');
              handleLog();
            }}
            disabled={saving}
            style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 }}>
              {saving ? 'Logging...' : 'Log meal'}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
