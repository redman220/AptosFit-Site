import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfileInput } from '@/utils/api';
import { apiDelete } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ProgressBar } from '@/components/ProgressBar';
import { IconSymbol } from '@/components/IconSymbol';

const ACTIVITY_LEVELS: { value: UserProfileInput['activity_level']; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Light' },
  { value: 'moderately_active', label: 'Moderate' },
  { value: 'very_active', label: 'Very Active' },
  { value: 'extra_active', label: 'Extra Active' },
];

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  unit?: string;
}

function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', unit }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
        {label}
      </Text>
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

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      color: COLORS.textSecondary,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginTop: 8,
      marginBottom: 4,
    }}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, profile, saveProfile, isFirstLaunch } = useUser();
  const { signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<UserProfileInput['activity_level']>('moderately_active');
  const [goalCalories, setGoalCalories] = useState('2000');
  const [goalProtein, setGoalProtein] = useState('150');
  const [goalCarbs, setGoalCarbs] = useState('200');
  const [goalFat, setGoalFat] = useState('65');
  const [goalLiftingVolume, setGoalLiftingVolume] = useState('5000');
  const [goalCardioMinutes, setGoalCardioMinutes] = useState('150');

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setAge(String(profile.age ?? ''));
      setWeight(String(profile.weight_lbs ?? ''));
      setHeight(String(profile.height_inches ?? ''));
      setActivityLevel(profile.activity_level ?? 'moderately_active');
      setGoalCalories(String(profile.goal_calories ?? 2000));
      setGoalProtein(String(profile.goal_protein_g ?? 150));
      setGoalCarbs(String(profile.goal_carbs_g ?? 200));
      setGoalFat(String(profile.goal_fat_g ?? 65));
      setGoalLiftingVolume(String(profile.goal_lifting_volume_lbs ?? 5000));
      setGoalCardioMinutes(String(profile.goal_cardio_minutes ?? 150));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!userId) return;
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name to continue.');
      return;
    }
    console.log('[Settings] Saving profile for user:', userId);
    setSaving(true);
    try {
      await saveProfile({
        name: name.trim(),
        age: Number(age) || 25,
        weight_lbs: Number(weight) || 150,
        height_inches: Number(height) || 68,
        activity_level: activityLevel,
        goal_calories: Number(goalCalories) || 2000,
        goal_protein_g: Number(goalProtein) || 150,
        goal_carbs_g: Number(goalCarbs) || 200,
        goal_fat_g: Number(goalFat) || 65,
        goal_lifting_volume_lbs: Number(goalLiftingVolume) || 5000,
        goal_cardio_minutes: Number(goalCardioMinutes) || 150,
      });
      console.log('[Settings] Profile saved successfully');
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('[Settings] Save error:', e);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goalCalNum = Number(goalCalories) || 2000;
  const goalProtNum = Number(goalProtein) || 150;
  const goalCarbsNum = Number(goalCarbs) || 200;
  const goalFatNum = Number(goalFat) || 65;
  const goalLiftNum = Number(goalLiftingVolume) || 5000;
  const goalCardioNum = Number(goalCardioMinutes) || 150;

  const todayCalProgress = profile ? Math.min((profile.goal_calories > 0 ? 0 : 0), 1) : 0;

  const handleDeleteAccount = () => {
    console.log('[Settings] Delete Account button pressed');
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[Settings] Delete account cancelled at first prompt') },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            console.log('[Settings] Delete account first confirmation passed, showing second prompt');
            Alert.alert(
              'Are you absolutely sure?',
              'All your logs, goals, and progress will be deleted forever.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => console.log('[Settings] Delete account cancelled at second prompt') },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    console.log('[Settings] Confirmed account deletion, calling DELETE /api/account');
    setDeleting(true);
    try {
      await apiDelete('/api/account');
      console.log('[Settings] Account deleted successfully, signing out');
      await signOut();
      router.replace('/auth-screen' as any);
    } catch (e) {
      console.error('[Settings] Account deletion error:', e);
      Alert.alert('Error', 'Could not delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isFirstLaunch ? 'Welcome to Aptos' : 'Settings' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isFirstLaunch && (
            <View style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: `${COLORS.primary}30`,
              gap: 6,
              marginBottom: 8,
            }}>
              <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
                Welcome to Aptos!
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, lineHeight: 20 }}>
                Set up your profile and goals to get started tracking your nutrition and fitness.
              </Text>
            </View>
          )}

          {/* Profile */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 14,
          }}>
            <SectionHeader title="Profile" />
            <InputField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <InputField label="Age" value={age} onChangeText={setAge} placeholder="25" keyboardType="numeric" unit="yrs" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Weight" value={weight} onChangeText={setWeight} placeholder="150" keyboardType="decimal-pad" unit="lbs" />
              </View>
            </View>
            <InputField label="Height" value={height} onChangeText={setHeight} placeholder="68" keyboardType="decimal-pad" unit="in" />
            <View style={{ gap: 6 }}>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                Activity Level
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                  {ACTIVITY_LEVELS.map((level) => {
                    const isSelected = activityLevel === level.value;
                    return (
                      <AnimatedPressable
                        key={level.value}
                        onPress={() => {
                          console.log('[Settings] Activity level changed to:', level.value);
                          setActivityLevel(level.value);
                        }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.primary : COLORS.border,
                        }}
                      >
                        <Text style={{
                          color: isSelected ? '#fff' : COLORS.textSecondary,
                          fontFamily: 'SpaceGrotesk_500Medium',
                          fontSize: 13,
                        }}>
                          {level.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Nutrition Goals */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 14,
          }}>
            <SectionHeader title="Nutrition Goals" />
            <InputField label="Daily Calories" value={goalCalories} onChangeText={setGoalCalories} placeholder="2000" keyboardType="numeric" unit="kcal" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <InputField label="Protein" value={goalProtein} onChangeText={setGoalProtein} placeholder="150" keyboardType="numeric" unit="g" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Carbs" value={goalCarbs} onChangeText={setGoalCarbs} placeholder="200" keyboardType="numeric" unit="g" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Fat" value={goalFat} onChangeText={setGoalFat} placeholder="65" keyboardType="numeric" unit="g" />
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {[
                { label: 'Calories', value: goalCalNum, color: COLORS.primary },
                { label: 'Protein', value: goalProtNum, color: '#4FC3F7' },
                { label: 'Carbs', value: goalCarbsNum, color: '#FFB74D' },
                { label: 'Fat', value: goalFatNum, color: COLORS.accent },
              ].map((g) => {
                const goalText = `Goal: ${g.value.toLocaleString()}${g.label === 'Calories' ? ' kcal' : 'g'}`;
                return (
                  <View key={g.label} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                        {g.label}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                        {goalText}
                      </Text>
                    </View>
                    <ProgressBar value={0} color={g.color} height={4} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Fitness Goals */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 14,
          }}>
            <SectionHeader title="Fitness Goals" />
            <InputField
              label="Weekly Lifting Volume"
              value={goalLiftingVolume}
              onChangeText={setGoalLiftingVolume}
              placeholder="5000"
              keyboardType="numeric"
              unit="lbs"
            />
            <InputField
              label="Weekly Cardio"
              value={goalCardioMinutes}
              onChangeText={setGoalCardioMinutes}
              placeholder="150"
              keyboardType="numeric"
              unit="min"
            />
            <View style={{ gap: 10 }}>
              {[
                { label: 'Lifting Volume', goal: goalLiftNum, unit: 'lbs' },
                { label: 'Cardio Minutes', goal: goalCardioNum, unit: 'min' },
              ].map((g) => {
                const goalText = `Goal: ${g.goal.toLocaleString()} ${g.unit}`;
                return (
                  <View key={g.label} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                        {g.label}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                        {goalText}
                      </Text>
                    </View>
                    <ProgressBar value={0} color={COLORS.primary} height={4} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Settings] Save button pressed');
              handleSave();
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
              {saving ? 'Saving...' : 'Save changes'}
            </Text>
          </AnimatedPressable>

          {/* Danger Zone */}
          <View style={{ marginTop: 8 }}>
            <SectionHeader title="Danger Zone" />
            <AnimatedPressable
              onPress={handleDeleteAccount}
              disabled={deleting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.25)',
                marginTop: 6,
              }}
            >
              <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
