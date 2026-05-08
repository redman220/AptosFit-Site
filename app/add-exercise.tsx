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
import { createExerciseLog } from '@/utils/api';
import type { ExerciseLog } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const EXERCISE_TYPES: { value: ExerciseLog['exercise_type']; label: string; color: string }[] = [
  { value: 'strength', label: 'Strength', color: COLORS.primary },
  { value: 'cardio', label: 'Cardio', color: COLORS.accent },
  { value: 'hiit', label: 'HIIT', color: COLORS.warning },
  { value: 'flexibility', label: 'Flexibility', color: '#4FC3F7' },
  { value: 'other', label: 'Other', color: COLORS.textSecondary },
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
  multiline?: boolean;
}

function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', unit, required, multiline }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
          {label}
        </Text>
        {required && <Text style={{ color: COLORS.primary, fontSize: 13 }}>*</Text>}
      </View>
      <View style={{
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
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
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: COLORS.text,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontSize: 15,
            padding: 0,
            minHeight: multiline ? 60 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {unit && !multiline && (
          <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AddExerciseScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [exerciseType, setExerciseType] = useState<ExerciseLog['exercise_type']>('strength');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isStrength = exerciseType === 'strength';
  const isCardioOrHiit = exerciseType === 'cardio' || exerciseType === 'hiit';

  const handleLog = async () => {
    if (!userId) return;
    if (!exerciseName.trim()) {
      Alert.alert('Missing exercise name', 'Please enter the exercise name.');
      return;
    }
    console.log('[AddExercise] Logging exercise:', { exerciseName, exerciseType });
    setSaving(true);
    try {
      await createExerciseLog({
        user_id: userId,
        date: formatDateAPI(new Date()),
        exercise_name: exerciseName.trim(),
        exercise_type: exerciseType,
        sets: sets ? Number(sets) : undefined,
        reps: reps ? Number(reps) : undefined,
        weight_lbs: weightLbs ? Number(weightLbs) : undefined,
        duration_minutes: duration ? Number(duration) : undefined,
        distance_miles: distance ? Number(distance) : undefined,
        calories_burned: caloriesBurned ? Number(caloriesBurned) : undefined,
        notes: notes.trim() || undefined,
      });
      console.log('[AddExercise] Exercise logged successfully');
      router.back();
    } catch (e) {
      console.error('[AddExercise] Error logging exercise:', e);
      Alert.alert('Error', 'Could not log exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Log Exercise' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exercise Type */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Exercise type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {EXERCISE_TYPES.map((type) => {
                  const isSelected = exerciseType === type.value;
                  return (
                    <AnimatedPressable
                      key={type.value}
                      onPress={() => {
                        console.log('[AddExercise] Exercise type selected:', type.value);
                        setExerciseType(type.value);
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: isSelected ? `${type.color}20` : COLORS.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: isSelected ? type.color : COLORS.border,
                      }}
                    >
                      <Text style={{
                        color: isSelected ? type.color : COLORS.textSecondary,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                        fontSize: 13,
                      }}>
                        {type.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <InputField
            label="Exercise name"
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="e.g. Bench press"
            required
          />

          {/* Strength fields */}
          {isStrength && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <InputField label="Sets" value={sets} onChangeText={setSets} placeholder="3" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Reps" value={reps} onChangeText={setReps} placeholder="10" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Weight" value={weightLbs} onChangeText={setWeightLbs} placeholder="135" keyboardType="decimal-pad" unit="lbs" />
              </View>
            </View>
          )}

          {/* Cardio/HIIT fields */}
          {isCardioOrHiit && (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <InputField label="Duration" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" unit="min" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="Distance" value={distance} onChangeText={setDistance} placeholder="0" keyboardType="decimal-pad" unit="mi" />
                </View>
              </View>
              <InputField label="Calories burned" value={caloriesBurned} onChangeText={setCaloriesBurned} placeholder="0" keyboardType="numeric" unit="kcal" />
            </>
          )}

          {/* Other/Flexibility fields */}
          {!isStrength && !isCardioOrHiit && (
            <>
              <InputField label="Duration" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" unit="min" />
              <InputField label="Calories burned" value={caloriesBurned} onChangeText={setCaloriesBurned} placeholder="0" keyboardType="numeric" unit="kcal" />
            </>
          )}

          <InputField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this exercise..."
            multiline
          />

          <AnimatedPressable
            onPress={() => {
              console.log('[AddExercise] Log exercise button pressed');
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
              {saving ? 'Logging...' : 'Log exercise'}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
