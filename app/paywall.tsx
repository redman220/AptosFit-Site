/**
 * Paywall Screen — Marketing-style redesign
 *
 * Dark grey + red theme. 7-day free trial offer.
 * All RevenueCat logic preserved from original.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Animated,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { COLORS } from "@/constants/Colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Feature cards for the 2-column grid
const FEATURE_CARDS = [
  {
    icon: "🔥",
    title: "Calorie & Macro Tracking",
    subtitle: "Log meals and hit your daily targets",
  },
  {
    icon: "💪",
    title: "Workout Logging",
    subtitle: "Track sets, reps, weight and cardio",
  },
  {
    icon: "📈",
    title: "Progress Charts",
    subtitle: "Visualize weight, calories & volume trends",
  },
  {
    icon: "👥",
    title: "Community Feed",
    subtitle: "Share workouts and follow friends",
  },
  {
    icon: "🎯",
    title: "Custom Goals",
    subtitle: "Set nutrition and fitness targets",
  },
  {
    icon: "⌚",
    title: "Wearable Sync",
    subtitle: "Connect Apple Watch or Fitbit",
  },
];

// Scrolling pills for the hero section
const FEATURE_PILLS = [
  "📊 Macro Tracking",
  "💪 Workout Logging",
  "👥 Community",
  "📈 Progress Trends",
  "🎯 Custom Goals",
];

const PILL_WIDTH = 160;
const PILL_GAP = 12;
const TOTAL_PILL_WIDTH = (PILL_WIDTH + PILL_GAP) * FEATURE_PILLS.length;

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    packages,
    loading,
    isSubscribed,
    isVip,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
    mockNativePurchase,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(packages[0] || null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<"idle" | "processing">("idle");
  const [webMockDialogState, setWebMockDialogState] = useState<
    "hidden" | "selecting" | "failed"
  >("hidden");

  // Pill scroll animation
  const pillTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pillTranslateX, {
        toValue: -TOTAL_PILL_WIDTH / 2,
        duration: 14000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [pillTranslateX]);

  // Update selected package when packages load
  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log("[Paywall] Purchase button pressed", { packageId: selectedPackage.identifier });
    try {
      setPurchasing(true);
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log("[Paywall] Purchase successful, navigating to nutrition tab");
        router.replace("/(tabs)/(nutrition)");
      }
    } catch (error: any) {
      console.log("[Paywall] Purchase failed", error?.message);
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log("[Paywall] Restore purchases pressed");
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log("[Paywall] Restore successful, navigating to nutrition tab");
        router.replace("/(tabs)/(nutrition)");
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      console.log("[Paywall] Restore failed", error?.message);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log("[Paywall] Close button pressed");
    router.replace("/(tabs)/(nutrition)");
  };

  const handleWebMockPurchase = async () => {
    if (!selectedPackage) return;
    console.log("[Paywall] Web mock purchase initiated", { packageId: selectedPackage.identifier });
    setWebMockState("processing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setWebMockState("idle");
    setWebMockDialogState("selecting");
  };

  // ─── Already subscribed ───────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          {/* Close button */}
          {(isSubscribed || __DEV__) && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          <View style={styles.subscribedContent}>
            <Text style={styles.subscribedEmoji}>🎉</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={styles.subscribedTitle}>You're a Pro Member</Text>
              {isVip ? (
                <View style={{
                  backgroundColor: '#B8860B',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#FFD700',
                }}>
                  <Text style={{ color: '#FFD700', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.6 }}>
                    VIP
                  </Text>
                </View>
              ) : (
                <View style={{
                  backgroundColor: 'rgba(229,57,53,0.18)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(229,57,53,0.4)',
                }}>
                  <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 0.6 }}>
                    PRO MEMBER
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.subscribedSubtitle}>
              All features are unlocked and ready to use
            </Text>

            <View style={styles.subscribedFeatureList}>
              {FEATURE_CARDS.map((f, i) => (
                <View key={i} style={styles.subscribedFeatureRow}>
                  <View style={styles.greenCheck}>
                    <Text style={styles.greenCheckText}>✓</Text>
                  </View>
                  <Text style={styles.subscribedFeatureText}>{f.title}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.startTrainingButton} onPress={handleClose}>
              <Text style={styles.startTrainingText}>Start Training</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // ─── Derived display values ───────────────────────────────────────────────
  const hasTrial =
    selectedPackage?.product?.introPrice != null ||
    selectedPackage?.product?.introductoryPrice != null;
  const priceString = selectedPackage?.product?.priceString ?? "$9.99/mo";
  const ctaLabel = hasTrial
    ? "Start 7-Day Free Trial"
    : selectedPackage
    ? `Subscribe for ${priceString}`
    : "Start 7-Day Free Trial";

  const bottomPad = insets.bottom + 16;

  // Doubled pills array for seamless loop
  const allPills = [...FEATURE_PILLS, ...FEATURE_PILLS];

  return (
    <View style={styles.container}>
      {/* Close button — only in dev or if subscribed */}
      {__DEV__ && (
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={handleClose}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#3D0000", "#1A1A1A"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={[styles.heroInner, { paddingTop: insets.top + 48 }]}>
            <Text style={styles.heroAppName}>
              Aptos <Text style={styles.heroEmoji}>⚡</Text>
            </Text>
            <Text style={styles.heroTagline}>
              Your AI-powered fitness &amp; nutrition coach
            </Text>
          </View>

          {/* Scrolling pills */}
          <View style={styles.pillsWrapper}>
            <Animated.View
              style={[
                styles.pillsTrack,
                { transform: [{ translateX: pillTranslateX }] },
              ]}
            >
              {allPills.map((pill, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </LinearGradient>

        {/* ── Feature Cards Grid ────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>EVERYTHING YOU NEED</Text>
          <View style={styles.featureGrid}>
            {FEATURE_CARDS.map((card, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={styles.featureIconCircle}>
                  <Text style={styles.featureCardIcon}>{card.icon}</Text>
                </View>
                <Text style={styles.featureCardTitle}>{card.title}</Text>
                <Text style={styles.featureCardSubtitle}>{card.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Trial Offer Banner ────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={["#E53935", "#B71C1C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.trialBanner}
          >
            <Text style={styles.trialBannerTitle}>Start Free — 7 Days on Us</Text>
            <Text style={styles.trialBannerSubtext}>
              Then $9.99/month. Cancel anytime.
            </Text>
            <View style={styles.trialBannerLockRow}>
              <Text style={styles.trialBannerLockIcon}>🔒</Text>
              <Text style={styles.trialBannerLockText}>No payment due today</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Package Selection ─────────────────────────────────────────── */}
        {packages.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>CHOOSE YOUR PLAN</Text>
            <View style={styles.packagesContainer}>
              {packages.map((pkg, idx) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isMostPopular = idx === 0;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected,
                    ]}
                    onPress={() => {
                      console.log("[Paywall] Package selected", { packageId: pkg.identifier });
                      setSelectedPackage(pkg);
                    }}
                    activeOpacity={0.8}
                  >
                    {isMostPopular && (
                      <View style={styles.mostPopularBadge}>
                        <Text style={styles.mostPopularText}>MOST POPULAR</Text>
                      </View>
                    )}
                    <View style={styles.packageRow}>
                      <View style={styles.packageInfo}>
                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                        {pkg.product.description ? (
                          <Text style={styles.packageDescription}>
                            {pkg.product.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.packagePriceCol}>
                        {pkg.product.priceString ? (
                          <Text style={styles.packagePrice}>
                            {pkg.product.priceString}
                          </Text>
                        ) : null}
                        {isSelected && (
                          <View style={styles.checkmarkCircle}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── No packages (native Expo Go) ──────────────────────────────── */}
        {!isWeb && packages.length === 0 && !loading && (
          <View style={[styles.sectionContainer, styles.noPackagesContainer]}>
            <Text style={styles.noPackagesText}>
              Purchases are not available in standard Expo Go.
            </Text>
            <Text style={[styles.noPackagesText, { marginTop: 8, opacity: 0.6 }]}>
              Use a development or production build to test purchases.
            </Text>
            {__DEV__ && (
              <TouchableOpacity
                style={styles.devMockButton}
                onPress={async () => {
                  console.log("[Paywall] Dev: simulate native purchase");
                  await mockNativePurchase();
                  router.replace("/(tabs)/(nutrition)");
                }}
              >
                <Text style={styles.devMockButtonText}>Dev: Simulate Purchase</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Bottom CTA ─────────────────────────────────────────────── */}
      <View style={[styles.bottomActions, { paddingBottom: bottomPad }]}>
        {isWeb ? (
          <>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!selectedPackage || webMockState === "processing") &&
                  styles.buttonDisabled,
              ]}
              onPress={handleWebMockPurchase}
              disabled={!selectedPackage || webMockState === "processing"}
              activeOpacity={0.85}
            >
              {webMockState === "processing" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => {
                  console.log("[Paywall] Opening Privacy Policy");
                  Linking.openURL("https://aptosfit.com/privacy/");
                }}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log("[Paywall] Opening Support");
                  Linking.openURL("https://aptosfit.com/support/");
                }}
              >
                <Text style={styles.linkText}>Support</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalText}>
              Preview mode — purchases available in the mobile app
            </Text>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!selectedPackage || purchasing) && styles.buttonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={!selectedPackage || purchasing}
              activeOpacity={0.85}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => {
                  console.log("[Paywall] Opening Privacy Policy");
                  Linking.openURL("https://aptosfit.com/privacy/");
                }}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log("[Paywall] Opening Support");
                  Linking.openURL("https://aptosfit.com/support/");
                }}
              >
                <Text style={styles.linkText}>Support</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalText}>
              Payment will be charged to your{" "}
              {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account at
              confirmation of purchase. Subscription automatically renews unless
              canceled at least 24 hours before the end of the current period.
            </Text>
          </>
        )}
      </View>

      {/* ── Web Mock Purchase Dialog ──────────────────────────────────────── */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.webDialogOverlay}>
          <View style={styles.webDialogBox}>
            {webMockDialogState === "selecting" && (
              <>
                <Text style={styles.webDialogTitle}>Test Purchase</Text>
                <Text style={styles.webDialogBody}>
                  {`⚠️ This is a test purchase for development only.\n\nPackage: ${selectedPackage?.identifier}\nPrice: ${selectedPackage?.product.priceString ?? "N/A"}`}
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#FF3B30" }]}>
                    Test Failed Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => {
                    console.log("[Paywall] Web mock: valid purchase confirmed");
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.replace("/(tabs)/(nutrition)");
                  }}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Test Valid Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={styles.webDialogTitle}>Purchase Failed</Text>
                <Text style={styles.webDialogBody}>
                  Test purchase failure: no real transaction occurred.
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    OK
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom set dynamically
  },

  // ── Close button ──────────────────────────────────────────────────────────
  closeButton: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: "SpaceGrotesk_400Regular",
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroGradient: {
    paddingBottom: 32,
    overflow: "hidden",
  },
  heroInner: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
  },
  heroAppName: {
    fontSize: 48,
    fontFamily: "SpaceGrotesk_700Bold",
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 10,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTagline: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },

  // ── Pills ─────────────────────────────────────────────────────────────────
  pillsWrapper: {
    overflow: "hidden",
    height: 40,
  },
  pillsTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: PILL_GAP,
    paddingHorizontal: 16,
  },
  pill: {
    width: PILL_WIDTH,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(229,57,53,0.18)",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(255,255,255,0.85)",
  },

  // ── Section container ─────────────────────────────────────────────────────
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // ── Feature grid ──────────────────────────────────────────────────────────
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(229,57,53,0.15)",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  featureCardIcon: {
    fontSize: 20,
  },
  featureCardTitle: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_700Bold",
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  featureCardSubtitle: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // ── Trial banner ──────────────────────────────────────────────────────────
  trialBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  trialBannerTitle: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  trialBannerSubtext: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 14,
  },
  trialBannerLockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  trialBannerLockIcon: {
    fontSize: 13,
  },
  trialBannerLockText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(255,255,255,0.9)",
  },

  // ── Packages ──────────────────────────────────────────────────────────────
  packagesContainer: {
    gap: 10,
  },
  packageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  packageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(229,57,53,0.08)",
  },
  mostPopularBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  mostPopularText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  packageDescription: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  packagePriceCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  packagePrice: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
    color: COLORS.text,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "bold",
  },

  // ── No packages ───────────────────────────────────────────────────────────
  noPackagesContainer: {
    alignItems: "center",
  },
  noPackagesText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  devMockButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderStyle: "dashed",
  },
  devMockButtonText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  // ── Bottom CTA ────────────────────────────────────────────────────────────
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  restoreButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
  },
  linkSeparator: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
  },
  legalText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 15,
  },

  // ── Web mock dialog ───────────────────────────────────────────────────────
  webDialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  webDialogBox: {
    backgroundColor: "#f2f2f7",
    borderRadius: 14,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
  },
  webDialogTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  webDialogDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  webDialogButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  webDialogButtonText: {
    fontSize: 17,
  },

  // ── Subscribed state ──────────────────────────────────────────────────────
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  subscribedEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  subscribedTitle: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subscribedSubtitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  subscribedFeatureList: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  subscribedFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greenCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
  },
  greenCheckText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  subscribedFeatureText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: COLORS.text,
  },
  startTrainingButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startTrainingText: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
