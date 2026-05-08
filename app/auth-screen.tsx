import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LoadingButton } from '@/components/LoadingButton';
import { Mail, Lock, User, AlertCircle } from 'lucide-react-native';

export default function AuthScreen() {
  const router = useRouter();
  const { user, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('[AuthScreen] User authenticated, navigating to nutrition tab');
      router.replace('/(tabs)/(nutrition)');
    }
  }, [user]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    console.log(`[AuthScreen] Attempting ${mode} for email:`, email);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        console.log('[AuthScreen] Sign in successful');
      } else {
        await signUpWithEmail(email.trim(), password, name.trim());
        console.log('[AuthScreen] Sign up successful');
      }
    } catch (e: unknown) {
      console.error('[AuthScreen] Auth error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('taken')) {
        setError('An account with this email already exists.');
      } else if (msg.toLowerCase().includes('password')) {
        setError('Password must be at least 8 characters.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    console.log('[AuthScreen] Toggle mode to:', mode === 'signin' ? 'signup' : 'signin');
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
  };

  const isSignUp = mode === 'signup';
  const buttonLabel = isSignUp ? 'Create account' : 'Sign in';
  const toggleLabel = isSignUp ? 'Already have an account?' : "Don't have an account?";
  const toggleAction = isSignUp ? 'Sign in' : 'Sign up';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Logo / App Name */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 32,
                fontFamily: 'SpaceGrotesk_700Bold',
                letterSpacing: -1,
              }}>
                A
              </Text>
            </View>
            <Text style={{
              color: COLORS.text,
              fontSize: 32,
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.5,
            }}>
              Aptos
            </Text>
            <Text style={{
              color: COLORS.textSecondary,
              fontSize: 15,
              fontFamily: 'SpaceGrotesk_400Regular',
              marginTop: 6,
            }}>
              Your personal fitness companion
            </Text>
          </View>

          {/* Form Card */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 16,
          }}>
            <Text style={{
              color: COLORS.text,
              fontSize: 20,
              fontFamily: 'SpaceGrotesk_700Bold',
              marginBottom: 4,
            }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>

            {/* Name field (sign up only) */}
            {isSignUp && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                  Full name
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 14,
                  gap: 10,
                }}>
                  <User size={18} color={COLORS.textTertiary} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={{
                      flex: 1,
                      height: 48,
                      color: COLORS.text,
                      fontFamily: 'SpaceGrotesk_400Regular',
                      fontSize: 15,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Email field */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                Email address
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                gap: 10,
              }}>
                <Mail size={18} color={COLORS.textTertiary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={{
                    flex: 1,
                    height: 48,
                    color: COLORS.text,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    fontSize: 15,
                  }}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
                Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                gap: 10,
              }}>
                <Lock size={18} color={COLORS.textTertiary} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={{
                    flex: 1,
                    height: 48,
                    color: COLORS.text,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    fontSize: 15,
                  }}
                />
              </View>
            </View>

            {/* Error message */}
            {error && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(229,57,53,0.1)',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(229,57,53,0.2)',
              }}>
                <AlertCircle size={16} color={COLORS.danger} />
                <Text style={{
                  flex: 1,
                  color: COLORS.danger,
                  fontFamily: 'SpaceGrotesk_400Regular',
                  fontSize: 13,
                  lineHeight: 18,
                }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Submit button */}
            <LoadingButton
              title={buttonLabel}
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
          </View>

          {/* Toggle mode */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 6 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
              {toggleLabel}
            </Text>
            <AnimatedPressable onPress={toggleMode}>
              <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                {toggleAction}
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
