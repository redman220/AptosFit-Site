import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import DatePicker from '@/components/DatePicker';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { createWeightLog } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Calendar } from 'lucide-react-native';

function formatDateAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AddWeightScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleLog = async () => {
    if (!userId) return;
    if (!weight || Number(weight) <= 0) {
      Alert.alert('Missing weight', 'Please enter your weight.');
      return;
    }
    console.log('[AddWeight] Logging weight:', weight, 'lbs on', formatDateAPI(date));
    setSaving(true);
    try {
      await createWeightLog({
        user_id: userId,
        date: formatDateAPI(date),
        weight_lbs: Number(weight),
      });
      console.log('[AddWeight] Weight logged successfully');
      router.back();
    } catch (e) {
      console.error('[AddWeight] Error logging weight:', e);
      Alert.alert('Error', 'Could not log weight. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dateDisplayText = formatDateDisplay(date);

  return (
    <>
      <Stack.Screen options={{ title: 'Log Weight' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 24, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Large weight input */}
          <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
              Weight
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  color: COLORS.primary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 64,
                  textAlign: 'center',
                  minWidth: 160,
                  padding: 0,
                  borderBottomWidth: 2,
                  borderBottomColor: focused ? COLORS.primary : COLORS.border,
                }}
              />
              <Text style={{
                color: COLORS.textSecondary,
                fontFamily: 'SpaceGrotesk_500Medium',
                fontSize: 24,
                marginTop: 24,
              }}>
                lbs
              </Text>
            </View>
          </View>

          {/* Date picker */}
          <View style={{ width: '100%', gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Date
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[AddWeight] Open date picker');
                setShowDatePicker(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <Calendar size={18} color={COLORS.primary} />
              <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15 }}>
                {dateDisplayText}
              </Text>
            </AnimatedPressable>
          </View>

          {showDatePicker && (
            <DatePicker
              value={date}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  console.log('[AddWeight] Date changed to:', formatDateAPI(selectedDate));
                  setDate(selectedDate);
                }
              }}
            />
          )}

          <AnimatedPressable
            onPress={() => {
              console.log('[AddWeight] Log weight button pressed');
              handleLog();
            }}
            disabled={saving}
            style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: 'center',
              width: '100%',
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 }}>
              {saving ? 'Logging...' : 'Log weight'}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
