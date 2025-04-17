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

import IrminCore from '@/lib/core';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { User } from '@/types/core/User';

/**
 * IAM context shape
 */
interface IAMContextValue {
  /**
   * Returns a valid JWT token, fetching a new one only if the cached token has expired.
   *
   * @returns promise resolving to the current token string
   */
  getToken: () => Promise<string>;
  /** user’s Irmin profile */
  profile: User | undefined;
  /** update profile in Irmin */
  updateProfile: (
    first_name: string,
    last_name: string,
    email: string,
    phone: string,
    company: string,
    profile_picture?: FileList
  ) => Promise<boolean>;
  /** loading state for auth/profile */
  isLoading: boolean;
  /** sign the user out */
  signOut: () => Promise<boolean>;
}

const IAMContext = createContext<IAMContextValue>({
  getToken: async () => {
    throw new Error('IAMProvider not initialised');
  },
  profile: undefined,
  updateProfile: async () => false,
  isLoading: false,
  signOut: async () => false,
});

export const IAMProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();

  // clerk hooks
  const {
    isLoaded: authLoaded,
    isSignedIn,
    sessionClaims,
    getToken: getClerkToken,
  } = useAuth();
  const { sessionId, signOut: clerkSignOut } = useAuth();
  const { isLoaded: userLoaded } = useUser();

  const [profile, setProfile] = useState<User>();
  const [isLoading, setIsLoading] = useState(true);

  // internally cache token and expiry
  const tokenRef = useRef<string | null>(null);
  const expiryRef = useRef<number>(0);
  const initSessionRef = useRef<string | null>(null);

  // hold any in-flight fetch promise
  const tokenPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Clears all IAM state and cached token
   */
  const resetIAM = useCallback(() => {
    setProfile(undefined);
    tokenRef.current = null;
    expiryRef.current = 0;
    initSessionRef.current = null;
  }, []);

  /**
   * Returns a valid token, only calling Clerk if the cached one is expired.
   * Ensures concurrent calls share the same in-flight promise.
   *
   * @returns current JWT token
   */
  const getToken = useCallback(async (): Promise<string> => {
    const now = Date.now();
    const bufferMs = 5 * 1000; // 5s before expiry

    // return cached if still valid
    if (tokenRef.current && expiryRef.current - bufferMs > now) {
      return tokenRef.current;
    }

    // if a fetch is already underway, reuse it
    if (tokenPromiseRef.current) {
      return tokenPromiseRef.current;
    }

    // otherwise start a new fetch
    tokenPromiseRef.current = (async () => {
      const newToken = await getClerkToken({ template: 'irmin-core' });
      if (!newToken) {
        console.warn('Failed to get token from Clerk');
        return tokenRef.current || '';
      }

      tokenRef.current = newToken;

      // use exp claim (in seconds) if available
      if (sessionClaims?.exp) {
        expiryRef.current = sessionClaims.exp * 1000;
      } else {
        // fallback TTL
        expiryRef.current = now + 60 * 1000;
      }

      return newToken;
    })().finally(() => {
      // clear pending promise ref whether success or error
      tokenPromiseRef.current = null;
    });

    return tokenPromiseRef.current;
  }, [sessionClaims, getClerkToken]);

  /**
   * Fetch the Irmin profile once per session, and prime the token cache.
   */
  const fetchProfile = useCallback(async () => {
    if (!authLoaded || !userLoaded) return;
    if (!isSignedIn || !sessionId) {
      resetIAM();
      setIsLoading(false);
      return;
    }
    if (initSessionRef.current === sessionId) {
      setIsLoading(false);
      return;
    }

    initSessionRef.current = sessionId;
    setIsLoading(true);

    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.profileService.getProfile();
      if (res.data) {
        setProfile(res.data);
      } else {
        resetIAM();
      }
    } catch (err) {
      console.error('Error fetching profile', err);
      resetIAM();
    } finally {
      setIsLoading(false);
    }
  }, [
    authLoaded,
    userLoaded,
    isSignedIn,
    sessionId,
    getToken,
    resetIAM,
    locale,
  ]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Signs the user out and resets IAM state
   *
   * @returns whether sign‑out succeeded
   */
  const signOut = useCallback(async (): Promise<boolean> => {
    resetIAM();
    router.replace(`/${locale}/sign-in`);
    await clerkSignOut();
    return true;
  }, [clerkSignOut, locale, resetIAM, router]);

  /**
   * Update the user's Irmin profile using the current token
   *
   * @returns whether the update succeeded
   */
  const updateProfile = useCallback(
    async (
      first_name: string,
      last_name: string,
      email: string,
      phone: string,
      company: string,
      profile_picture?: FileList
    ): Promise<boolean> => {
      try {
        const token = await getToken();
        const core = new IrminCore(locale, token);
        const r = await core.profileService.updateProfile({
          first_name,
          last_name,
          email,
          phone,
          company,
          avatar: profile_picture?.[0],
        });
        if (r.data) {
          setProfile(r.data);
          irminAlert('success', r.message ?? 'Profile updated');
          return true;
        }
        throw new Error(r.message);
      } catch (err) {
        irminAlert('error', (err as Error).message ?? 'Error updating profile');
        return false;
      }
    },
    [irminAlert, locale, getToken]
  );

  const value = useMemo<IAMContextValue>(
    () => ({
      getToken,
      profile,
      updateProfile,
      isLoading,
      signOut,
    }),
    [getToken, profile, updateProfile, isLoading, signOut]
  );

  return <IAMContext.Provider value={value}>{children}</IAMContext.Provider>;
};

/**
 * Hook to consume the IAM context
 */
export const useIAM = () => {
  const ctx = useContext(IAMContext);
  if (!ctx) throw new Error('useIAM must be used within IAMProvider');
  return ctx;
};
