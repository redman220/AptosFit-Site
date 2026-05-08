import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { IconSymbol } from '@/components/IconSymbol';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

interface VipEntry {
  id: string;
  email: string;
  label: string | null;
  granted_by: string;
  created_at: string;
}

function SkeletonRow() {
  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    }}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 14, width: '60%', backgroundColor: COLORS.surfaceSecondary, borderRadius: 6 }} />
        <View style={{ height: 11, width: '35%', backgroundColor: COLORS.surfaceSecondary, borderRadius: 6 }} />
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary }} />
    </View>
  );
}

export default function VipManagerScreen() {
  const [vips, setVips] = useState<VipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchVips = useCallback(async () => {
    console.log('[VipManager] Fetching VIP list');
    setLoading(true);
    setForbidden(false);
    try {
      const data = await apiGet<{ vips: VipEntry[] }>('/api/vip');
      console.log('[VipManager] Loaded', data.vips.length, 'VIPs');
      setVips(data.vips);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403')) {
        setForbidden(true);
      } else {
        console.error('[VipManager] Fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVips();
  }, [fetchVips]);

  const handleAdd = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setAddError('Please enter an email address.');
      return;
    }
    console.log('[VipManager] Add VIP pressed', { email, label: labelInput.trim() });
    setAdding(true);
    setAddError(null);
    setSuccessId(null);
    try {
      const body: { email: string; label?: string } = { email };
      if (labelInput.trim()) body.label = labelInput.trim();
      const data = await apiPost<{ vip: VipEntry }>('/api/vip', body);
      console.log('[VipManager] VIP added:', data.vip.id);
      setVips((prev) => [data.vip, ...prev]);
      setSuccessId(data.vip.id);
      setEmailInput('');
      setLabelInput('');
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[VipManager] Add error:', msg);
      if (msg.toLowerCase().includes('already') || msg.includes('409')) {
        setAddError('This email is already on the VIP list.');
      } else if (msg.includes('400')) {
        setAddError('Invalid email address.');
      } else {
        setAddError('Failed to add VIP. Please try again.');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (vip: VipEntry) => {
    console.log('[VipManager] Remove VIP pressed', { id: vip.id, email: vip.email });
    Alert.alert(
      'Remove VIP',
      `Remove ${vip.email} from the Friends & Family list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(vip.id);
            try {
              await apiDelete(`/api/vip/${vip.id}`);
              console.log('[VipManager] VIP removed:', vip.id);
              setVips((prev) => prev.filter((v) => v.id !== vip.id));
            } catch (err) {
              console.error('[VipManager] Remove error:', err);
              Alert.alert('Error', 'Could not remove VIP. Please try again.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Forbidden ──────────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <>
        <Stack.Screen options={{ title: 'Friends & Family' }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: 'rgba(229,57,53,0.12)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, textAlign: 'center', marginBottom: 10 }}>
            Access Restricted
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            You don't have permission to manage VIP access.
          </Text>
        </View>
      </>
    );
  }

  const addButtonDisabled = adding || !emailInput.trim();

  return (
    <>
      <Stack.Screen options={{ title: 'Friends & Family' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header card */}
          <View style={{
            backgroundColor: 'rgba(229,57,53,0.08)',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(229,57,53,0.2)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              backgroundColor: 'rgba(229,57,53,0.15)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="star" size={22} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 }}>
                Friends & Family
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 }}>
                Grant free Pro access to people you trust
              </Text>
            </View>
          </View>

          {/* Add form */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 12,
          }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Add VIP
            </Text>

            <TextInput
              value={emailInput}
              onChangeText={(v) => { setEmailInput(v); setAddError(null); }}
              placeholder="Email address"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: addError ? COLORS.primary : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: COLORS.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
              }}
            />

            <TextInput
              value={labelInput}
              onChangeText={setLabelInput}
              placeholder="Label (optional — e.g. John - brother)"
              placeholderTextColor={COLORS.textTertiary}
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

            {addError && (
              <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 }}>
                {addError}
              </Text>
            )}

            {successId && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(76,175,80,0.12)',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: 'rgba(76,175,80,0.25)',
              }}>
                <Text style={{ color: '#4CAF50', fontSize: 14 }}>✓</Text>
                <Text style={{ color: '#4CAF50', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 }}>
                  Added successfully
                </Text>
              </View>
            )}

            <AnimatedPressable
              onPress={handleAdd}
              disabled={addButtonDisabled}
              style={{
                backgroundColor: addButtonDisabled ? 'rgba(229,57,53,0.4)' : COLORS.primary,
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15 }}>
                  Add
                </Text>
              )}
            </AnimatedPressable>
          </View>

          {/* VIP list */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Current VIPs
            </Text>

            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : vips.length === 0 ? (
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 24,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                gap: 8,
              }}>
                <Text style={{ fontSize: 32 }}>👑</Text>
                <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, textAlign: 'center' }}>
                  No VIPs yet. Add friends and family below.
                </Text>
              </View>
            ) : (
              vips.map((vip) => {
                const isRemoving = removingId === vip.id;
                const dateStr = new Date(vip.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <View
                    key={vip.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      backgroundColor: 'rgba(229,57,53,0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 18 }}>👑</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                        {vip.email}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {vip.label ? (
                          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={1}>
                            {vip.label}
                          </Text>
                        ) : null}
                        {vip.label ? (
                          <Text style={{ color: COLORS.textTertiary, fontSize: 10 }}>•</Text>
                        ) : null}
                        <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                          {dateStr}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(vip)}
                      disabled={isRemoving}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: 'rgba(229,57,53,0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {isRemoving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={16} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
