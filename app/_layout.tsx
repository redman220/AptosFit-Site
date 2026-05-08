import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { COLORS } from '@/constants/Colors';
import { isOnboardingComplete } from "@/utils/onboardingStorage";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

const AptosDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = React.useRef(false);

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

  useEffect(() => {
    if (onboardingComplete === null) return;
    if (loading) return;
    const inAuthScreen = segments[0] === 'auth-screen';
    if (!user && !inAuthScreen && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log('[NavigationGuard] No user, redirecting to auth-screen');
      router.replace('/auth-screen');
    }
    if (user) {
      hasRedirected.current = false;
    }
  }, [user, loading, segments, onboardingComplete, router]);

  if (onboardingComplete === null) {
    return null;
  }

  return <>{children}</>;
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function OnboardingRedirect() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;
    const onAuthScreen = pathname === "/auth-screen";
    if (onAuthScreen) return;
    if (!user) {
      router.replace("/auth-screen");
      return;
    }
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) {
        router.replace("/onboarding");
        return;
      }
    }).catch(() => {
      // Ignore errors, assume onboarding is complete
    });
    return () => { cancelled = true; };
  }, [authLoading, pathname, user, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={AptosDarkTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <OnboardingRedirect />
            <UserProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationGuard>

                  <Stack
                    screenOptions={{
                      headerStyle: { backgroundColor: COLORS.background },
                      headerTintColor: COLORS.text,
                      headerTitleStyle: {
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                        color: COLORS.text,
                      },
                      contentStyle: { backgroundColor: COLORS.background },
                    }}
                  >
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="auth-screen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="settings"
                      options={{
                        title: 'Settings',
                        presentation: 'card',
                        headerStyle: { backgroundColor: COLORS.background },
                        headerTintColor: COLORS.text,
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          color: COLORS.text,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="add-meal"
                      options={{
                        title: 'Log Meal',
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.6, 1.0],
                        headerStyle: { backgroundColor: COLORS.surface },
                        headerTintColor: COLORS.text,
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          color: COLORS.text,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="add-exercise"
                      options={{
                        title: 'Log Exercise',
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.65, 1.0],
                        headerStyle: { backgroundColor: COLORS.surface },
                        headerTintColor: COLORS.text,
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          color: COLORS.text,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="add-weight"
                      options={{
                        title: 'Log Weight',
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.45, 1.0],
                        headerStyle: { backgroundColor: COLORS.surface },
                        headerTintColor: COLORS.text,
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          color: COLORS.text,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="share-post"
                      options={{
                        title: 'Share Post',
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.65, 1.0],
                        headerStyle: { backgroundColor: COLORS.surface },
                        headerTintColor: COLORS.text,
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          color: COLORS.text,
                        },
                      }}
                    />
                  </Stack>
                </NavigationGuard>
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </UserProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
