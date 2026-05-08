import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getProfile, upsertProfile } from '@/utils/api';
import type { UserProfile, UserProfileInput } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserContextValue {
  userId: string | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  isFirstLaunch: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: UserProfileInput) => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  userId: null,
  profile: null,
  profileLoading: true,
  isFirstLaunch: false,
  refreshProfile: async () => {},
  saveProfile: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    console.log('[UserContext] Fetching profile for user:', userId);
    setProfileLoading(true);
    try {
      const p = await getProfile(userId);
      if (!p) {
        console.log('[UserContext] No profile found — first launch');
        setIsFirstLaunch(true);
      } else {
        console.log('[UserContext] Profile loaded:', p.name);
        setProfile(p);
      }
    } catch (e) {
      console.error('[UserContext] Failed to load profile:', e);
    } finally {
      setProfileLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refreshProfile();
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [userId, refreshProfile]);

  const saveProfile = useCallback(async (data: UserProfileInput) => {
    if (!userId) return;
    console.log('[UserContext] Saving profile for user:', userId);
    const updated = await upsertProfile(userId, data);
    setProfile(updated);
    setIsFirstLaunch(false);
    console.log('[UserContext] Profile saved successfully');
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, profile, profileLoading, isFirstLaunch, refreshProfile, saveProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
