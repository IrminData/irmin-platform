'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { useAuth, useUser } from '@clerk/nextjs';

import { getProfile } from '@/lib/actions/profile';
import IrminCore from '@/lib/core';
import { getToken } from '@/lib/getToken';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { User } from '@/types/core/User';

// Create IAM context
const IAMContext = createContext<{
  profile: User | undefined;
  updateProfile: (
    first_name: string,
    last_name: string,
    email: string,
    phone: string,
    company: string,
    profile_picture?: FileList
  ) => Promise<boolean>;
  isLoading: boolean;
  signOut: () => Promise<boolean>;
}>({
  profile: undefined,
  updateProfile: () => Promise.resolve(false),
  isLoading: false,
  signOut: () => Promise.resolve(false),
});

/**
 * Identity and Access Management (IAM) context provider
 *
 * Provides user profile data and authentication state.
 */
export const IAMProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { isSignedIn, isLoaded: clerkIsLoaded } = useUser();
  const { sessionId, signOut: clerkSignOut } = useAuth();

  const [profile, setProfile] = useState<User | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Track the session ID to avoid redundant fetches
  const initializedSessionIdRef = useRef<string | null>(null);

  // Prevent multiple concurrent sign-out operations
  const signingOutRef = useRef(false);

  /**
   * Resets the IAM state
   */
  const resetIAMState = useCallback(() => {
    setProfile(undefined);
    initializedSessionIdRef.current = null;
  }, []);

  /**
   * Fetches the Irmin profile and updates the IAM context
   */
  const fetchIrminProfile = useCallback(async () => {
    if (!clerkIsLoaded) return;

    if (!isSignedIn || !sessionId) {
      resetIAMState();
      setIsLoading(false);
      return;
    }

    if (initializedSessionIdRef.current === sessionId) {
      setIsLoading(false);
      return;
    }

    initializedSessionIdRef.current = sessionId;
    setIsLoading(true);

    try {
      const profile = await getProfile({});
      if (profile.data) {
        setProfile(profile.data);
      } else {
        resetIAMState();
      }
    } catch (error) {
      console.error('Error fetching Irmin profile in IAMContext:', error);
      resetIAMState();
    } finally {
      setIsLoading(false);
    }
  }, [clerkIsLoaded, isSignedIn, resetIAMState, sessionId]);

  /**
   * Signs the user out and cleans up the IAM context state
   */
  const signOut = useCallback(async () => {
    if (signingOutRef.current) return false;
    signingOutRef.current = true;

    try {
      if (!isSignedIn) {
        resetIAMState();
        router.replace(`/${locale}/sign-in`);
        return false;
      }

      router.replace(`/${locale}/sign-in`);
      await clerkSignOut();
      resetIAMState();
      return true;
    } catch (error) {
      console.error('Error signing out in IAMContext:', error);
      irminAlert('error', (error as Error).message ?? 'Failed to sign out');
      return false;
    } finally {
      signingOutRef.current = false;
    }
  }, [clerkSignOut, resetIAMState, irminAlert, locale, isSignedIn, router]);

  const handleUpdateProfile = useCallback(
    async (
      first_name: string,
      last_name: string,
      email: string,
      phone: string,
      company: string,
      profile_picture?: FileList
    ) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.profileService.updateProfile({
          first_name,
          last_name,
          email,
          phone,
          company,
          avatar:
            profile_picture && profile_picture.length > 0
              ? profile_picture[0]
              : undefined,
        });
        if (res?.data) {
          setProfile(res?.data);
          irminAlert('success', res?.message ?? 'Profile updated successfully');
        }
        if (!res?.data)
          throw new Error(res?.message ?? 'Failed to update profile');
        return true;
      } catch (error) {
        irminAlert(
          'error',
          (error as Error).message ?? 'Failed to update profile'
        );
        return false;
      }
    },
    [irminAlert]
  );

  /**
   * Fetches the Irmin profile data on component mount and when dependencies change
   */
  useEffect(() => {
    fetchIrminProfile();
  }, [fetchIrminProfile]);

  const value = useMemo(
    () => ({
      profile,
      updateProfile: handleUpdateProfile,
      isLoading,
      signOut,
    }),
    [profile, handleUpdateProfile, isLoading, signOut]
  );

  return <IAMContext.Provider value={value}>{children}</IAMContext.Provider>;
};

/**
 * Custom hook to use the IAM context
 */
export const useIAM = () => {
  const context = useContext(IAMContext);
  if (context === undefined) {
    throw new Error('useIAM must be used within an IAMProvider');
  }
  return context;
};
