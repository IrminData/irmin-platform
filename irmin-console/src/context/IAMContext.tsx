'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { useAuth, useUser } from '@clerk/nextjs';

import IrminCore from '@/lib/core';
import { Locale } from '@/lib/dict';

import { usePopup } from '@/context/PopupContext';

import { setCookie } from '@/utils/cookie';

import { User } from '@/types/core/User';
import { exampleProfile } from '@/types/examples/core';

// Determine if we're in offline mode
const authOfflineMode = process.env.NEXT_PUBLIC_AUTH_OFFLINE_MODE === 'true';

// Create IAM context
const IAMContext = createContext<{
  profile: User | undefined;
  token: string | undefined;
  isLoading: boolean;
  signOut: () => Promise<boolean>;
}>({
  profile: undefined,
  token: undefined,
  isLoading: false,
  signOut: () => Promise.resolve(false),
});

/**
 * Identity and Access Management (IAM) context provider
 *
 * @param iamParams - The IAM parameters
 * @param iamParams.children - The children components
 * @param iamParams.locale - The locale
 *
 * @remarks
 *
 * Provides user profile data and authentication state.
 */
export const IAMProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) => {
  const router = useRouter();
  const { irminAlert } = usePopup();
  const { isSignedIn, user, isLoaded: clerkIsLoaded } = useUser();
  const { sessionId, signOut: clerkSignOut, getToken } = useAuth();

  const [profile, setProfile] = useState<User | undefined>();
  const [token, setToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Track the session ID to avoid redundant fetches
  const initializedSessionIdRef = useRef<string | null>(null);

  // Prevent multiple concurrent sign-out operations
  const signingOutRef = useRef(false);

  /**
   * Retrieves and sets the user token from Clerk
   */
  const getUserToken = useCallback(async () => {
    if (authOfflineMode) {
      const offlineToken = 'offline-token';
      setToken(offlineToken);
      setCookie('token', offlineToken, 7);
      return offlineToken;
    }

    try {
      const newToken = await getToken();
      setToken(newToken ?? undefined);
      setCookie('token', newToken ?? '', 7);
      return newToken ?? undefined;
    } catch (error) {
      console.error('Failed to get token in IAMContext', error);
      setToken(undefined);
      setCookie('token', '', -1);
      return undefined;
    }
  }, [getToken]);

  /**
   * Refreshes the user token every 55 seconds
   */
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const refreshToken = async () => {
      await getUserToken();
    };

    if (!authOfflineMode) {
      refreshToken();
      intervalId = setInterval(refreshToken, 55000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [getUserToken]);

  /**
   * Resets the IAM state
   */
  const resetIAMState = useCallback(() => {
    setProfile(undefined);
    setToken(undefined);
    setCookie('token', '', -1);
    initializedSessionIdRef.current = null;
  }, []);

  /**
   * Fetches the Irmin profile and updates the IAM context
   */
  const fetchIrminProfile = useCallback(async () => {
    if (authOfflineMode) {
      await getUserToken();
      setProfile(exampleProfile);
      setIsLoading(false);
      return;
    }

    if (!clerkIsLoaded) return;

    if (!isSignedIn || !user || !sessionId) {
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
      const newToken = await getUserToken();
      if (!newToken) {
        resetIAMState();
        setIsLoading(false);
        return;
      }

      const irminCore = new IrminCore(locale, newToken);
      const res = await irminCore.profileService.getProfile();

      if (res?.data) {
        setProfile({ ...res.data, user });
      } else {
        resetIAMState();
      }
    } catch (error) {
      console.error('Error fetching Irmin profile in IAMContext:', error);
      resetIAMState();
    } finally {
      setIsLoading(false);
    }
  }, [
    clerkIsLoaded,
    getUserToken,
    isSignedIn,
    locale,
    resetIAMState,
    sessionId,
    user,
  ]);

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
        token,
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
