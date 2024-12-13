'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { useAuth, useUser } from '@clerk/nextjs';

import { getProfile, updateProfile } from '@/lib/actions/profile';

import { usePopup } from '@/context/PopupContext';

import { User } from '@/types/core/User';
import { exampleProfile } from '@/types/examples/core';

// Determine if we're in offline mode
const authOfflineMode = process.env.NEXT_PUBLIC_AUTH_OFFLINE_MODE === 'true';

// Create IAM context
const IAMContext = createContext<{
  profile: User | undefined;
  updateProfile: (
    first_name?: string,
    last_name?: string,
    email?: string,
    phone?: string,
    company?: string,
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
    if (authOfflineMode) {
      setProfile(exampleProfile);
      setIsLoading(false);
      return;
    }

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
      const profile = await getProfile();
      if (profile) {
        setProfile(profile);
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
        router.replace('/sign-in');
        return false;
      }

      await clerkSignOut();
      resetIAMState();
      router.replace('/sign-in');
      return true;
    } catch (error) {
      console.error('Error signing out in IAMContext:', error);
      irminAlert('error', (error as Error).message ?? 'Failed to sign out');
      return false;
    } finally {
      signingOutRef.current = false;
    }
  }, [clerkSignOut, resetIAMState, irminAlert, isSignedIn, router]);

  const handleUpdateProfile = useCallback(
    async (
      first_name?: string,
      last_name?: string,
      email?: string,
      phone?: string,
      company?: string,
      profile_picture?: FileList
    ) => {
      try {
        const res = await updateProfile(
          first_name,
          last_name,
          email,
          phone,
          company,
          profile_picture && profile_picture.length > 0
            ? profile_picture[0]
            : undefined
        );
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

  return (
    <IAMContext.Provider
      value={{
        profile,
        updateProfile: handleUpdateProfile,
        isLoading,
        signOut,
      }}
    >
      {children}
    </IAMContext.Provider>
  );
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
