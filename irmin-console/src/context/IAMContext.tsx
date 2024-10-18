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

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';
import { useAuth, useUser } from '@clerk/nextjs';

import { usePopup } from '@/context/PopupContext';

import { setCookie } from '@/utils/cookie';

import { User } from '@/types/core/User';
import { exampleProfile } from '@/types/examples/core';

// We need to ignore and simulate clerk in offline mode
const authOfflineMode = process.env.NEXT_PUBLIC_AUTH_OFFLINE_MODE === 'true';

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
 * Provider for `IAMContext` to handle user profile data and authentication.
 * Uses the {@link IrminCore} and the {@link IrminCore} to interact with the API.
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

  const { isSignedIn, user, isLoaded: clerkIsLoading } = useUser();
  const { sessionId, signOut: clerkSignOut, getToken } = useAuth();

  const [profile, setProfile] = useState<User | undefined>();
  const [profileLoading, setProfileLoading] = useState(true);

  // Session ID which the profile has been initialised for
  const initialiseForRef = useRef<string | null>(null);

  // Ref to avoid calling sign out while it's in progress
  const signingOut = useRef(false);

  // Clerk token
  const [token, setToken] = useState<string | undefined>();

  /**
   * Function to get and set the user's token from Clerk
   */
  const getUserToken = useCallback(async () => {
    // If we are in offline mode, just simulate the token
    if (authOfflineMode) {
      setToken('offline-token');
      setCookie('token', 'offline-token', 7);
      return 'offline-token';
    }
    // Get the token from Clerk
    try {
      const newToken = await getToken();
      setToken(newToken ?? undefined);
      setCookie('token', newToken ?? '', 7);
      return newToken ?? undefined;
    } catch (e) {
      console.error('Failed to get token in IAMContext', e);
      setToken(undefined);
      setCookie('token', '', -1);
      return undefined;
    }
  }, [getToken]);

  /**
   * Hook to refetch the user token every 55 seconds, since Clerk tokens expire after 1 minute
   */
  useEffect(() => {
    const interval = setInterval(() => {
      getUserToken();
    }, 55000);
    return () => clearInterval(interval);
  }, [getUserToken]);

  // Function to reset the IAM state in case of errors, sign out, etc.
  const resetIAMState = useCallback(() => {
    setProfile(undefined);
    setToken(undefined);
    setCookie('token', '', -1);
    initialiseForRef.current = null;
  }, []);

  /**
   * Function to fetch the Irmin profile and update the IAM context
   */
  const fetchIrminProfile = useCallback(async () => {
    // If we are in offline mode, just set the example profile infomation
    if (authOfflineMode) {
      await getUserToken();
      setProfile(exampleProfile);
      setProfileLoading(false);
      return;
    }
    try {
      // Check if clerk is loaded and user is signed in
      if (!isSignedIn || !user || !sessionId) return;
      initialiseForRef.current = sessionId;
      setProfileLoading(true);
      // Get the token and init the profile service
      const newToken = await getUserToken();
      if (!newToken) {
        // If no token is returned, reset the IAM state
        resetIAMState();
        return;
      }
      const { profileService } = new IrminCore(locale, newToken);
      // Fetch the Irmin profile data
      const res = await profileService.getProfile();
      if (!res) {
        // If no profile data is returned, reset the IAM state
        resetIAMState();
        return;
      }
      // Update the profile state
      setProfile({
        ...res.data,
        user,
      });
    } catch (error) {
      console.error('Error fetching Irmin profile in IAMContext:', error);
      resetIAMState();
    } finally {
      setProfileLoading(false);
    }
  }, [isSignedIn, locale, user, sessionId, getUserToken, resetIAMState]);

  /**
   * Function to sign the user out of Irmin and clean up the IAM context state
   */
  const signOut = useCallback(async () => {
    if (signingOut.current) return false;
    try {
      signingOut.current = true;
      // Don't do anything if not signed in to begin with
      if (!isSignedIn) return false;
      // Call Clerk's sign out method to sign the user out
      await clerkSignOut();
      return true;
    } catch (error) {
      console.error('Error signing out in IAMContext:', error);
      irminAlert(
        'error',
        (error as Error).message ?? 'Failed to update profile'
      );
      return false;
    } finally {
      // Reset the IAMContext
      resetIAMState();
      // Redirect to the sign in page
      router.replace('/sign-in');
      signingOut.current = false;
    }
  }, [clerkSignOut, resetIAMState, irminAlert, isSignedIn, router]);

  /**
   * Fetch the Irmin profile data on component mount and on Clerk user change
   */
  useEffect(() => {
    // Make sure that we are not fetching the profile data for the same user
    if (initialiseForRef.current === sessionId) return;
    // Fetch the Irmin profile data
    fetchIrminProfile();
  }, [sessionId, fetchIrminProfile]);

  // Combined IAM context loading state for Clerk and other fetches
  const isLoading = useMemo(
    () => profileLoading || (!authOfflineMode && !clerkIsLoading),
    [clerkIsLoading, profileLoading]
  );

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

export const useIAM = () => {
  const context = useContext(IAMContext);
  if (!context) {
    throw new Error('useIAM must be used within a IAMProvider');
  }
  return context;
};
