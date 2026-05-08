import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Dumbbell, UtensilsCrossed } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LoadingButton } from '@/components/LoadingButton';
import { createPost } from '@/utils/api';

export default function SharePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    post_type?: string;
    prefill_data?: string;
  }>();

  const [postType, setPostType] = useState<'workout' | 'meal'>(
    params.post_type === 'meal' ? 'meal' : 'workout'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [data, setData] = useState(params.prefill_data ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your post.');
      return;
    }
    console.log('[SharePost] Submitting post:', { postType, title, data });
    setError(null);
    setLoading(true);
    try {
      await createPost({
        post_type: postType,
        title: title.trim(),
        description: description.trim() || undefined,
        data: data.trim(),
      });
      console.log('[SharePost] Post created successfully');
      router.back();
    } catch (e) {
      console.error('[SharePost] Create post error:', e);
      setError('Could not share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Share Post' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Post type selector */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Post type
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['workout', 'meal'] as const).map(type => {
                const isActive = postType === type;
                const color = type === 'workout' ? COLORS.primary : COLORS.accent;
                const label = type === 'workout' ? 'Workout' : 'Meal';
                return (
                  <AnimatedPressable
                    key={type}
                    onPress={() => {
                      console.log('[SharePost] Select post type:', type);
                      setPostType(type);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isActive ? `${color}20` : COLORS.surfaceSecondary,
                      borderWidth: 1.5,
                      borderColor: isActive ? color : COLORS.border,
                    }}
                  >
                    {type === 'workout'
                      ? <Dumbbell size={18} color={isActive ? color : COLORS.textTertiary} />
                      : <UtensilsCrossed size={18} color={isActive ? color : COLORS.textTertiary} />
                    }
                    <Text style={{
                      color: isActive ? color : COLORS.textSecondary,
                      fontFamily: isActive ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_400Regular',
                      fontSize: 14,
                    }}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Title */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Title
              <Text style={{ color: COLORS.danger }}> *</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={postType === 'workout' ? 'e.g. Morning chest day' : 'e.g. High-protein lunch'}
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="next"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: COLORS.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
              }}
            />
          </View>

          {/* Description */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Description
              <Text style={{ color: COLORS.textTertiary }}> (optional)</Text>
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Share how it went..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              returnKeyType="next"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: COLORS.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Data */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
              Details
              <Text style={{ color: COLORS.textTertiary }}> (optional)</Text>
            </Text>
            <TextInput
              value={data}
              onChangeText={setData}
              placeholder={postType === 'workout' ? 'e.g. 3x10 bench press @ 185lbs' : 'e.g. 600 kcal, 45g protein'}
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: COLORS.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={{
              backgroundColor: 'rgba(229,57,53,0.1)',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(229,57,53,0.2)',
            }}>
              <Text style={{ color: COLORS.danger, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit */}
          <LoadingButton
            title="Share post"
            onPress={handleSubmit}
            loading={loading}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 4,
            }}
            textStyle={{
              color: '#fff',
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 16,
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
