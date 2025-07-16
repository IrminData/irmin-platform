'use client';

import {
  createContext,
  type ReactNode,
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

import AuthenticationErrorHandler from '@/components/ui/error/AuthenticationErrorHandler';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { User } from '@/types/core/User';

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
  /** user's Irmin profile */
  profile: User | undefined;
  /** update profile in Irmin */
  updateProfile: (
    _first_name: string,
    _last_name: string,
    _email: string,
    _phone: string,
    _company: string,
    _profile_picture?: FileList
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

export const IAMProvider = ({ children }: { children: ReactNode }) => {
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
  const [authError, setAuthError] = useState<Error | undefined>();

  // internally cache token and expiry
  const tokenRef = useRef<string | null>(null);
  const expiryRef = useRef<number>(0);
  const initSessionRef = useRef<string | null>(null);

  // token refresh state management
  const isRefreshingRef = useRef<boolean>(false);
  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const refreshQueueRef = useRef<
    {
      resolve: (_token: string) => void;
      reject: (_error: Error) => void;
    }[]
  >([]);

  /**
   * Clears all IAM state and cached token
   */
  const resetIAM = useCallback(() => {
    setProfile(undefined);
    setAuthError(undefined);
    tokenRef.current = null;
    expiryRef.current = 0;
    initSessionRef.current = null;
    isRefreshingRef.current = false;
    refreshPromiseRef.current = null;
    refreshQueueRef.current = [];
  }, []);

  /**
   * Processes the token refresh queue by resolving or rejecting all pending requests
   */
  const processRefreshQueue = useCallback(
    (token: string | null, error: Error | null) => {
      const queue = refreshQueueRef.current;
      refreshQueueRef.current = [];

      if (error) {
        queue.forEach(({ reject }) => reject(error));
      } else if (token) {
        queue.forEach(({ resolve }) => resolve(token));
      }
    },
    []
  );

  /**
   * Returns a valid token, only calling Clerk if the cached one is expired.
   * Implements proper queue mechanism to prevent race conditions.
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

    // if already refreshing, queue this request
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return new Promise<string>((resolve, reject) => {
        refreshQueueRef.current.push({ resolve, reject });
      });
    }

    // start a new refresh
    isRefreshingRef.current = true;
    refreshPromiseRef.current = (async () => {
      try {
        const newToken = await getClerkToken({ template: 'irmin-core' });
        if (!newToken) {
          const error = new Error('Failed to get token from Clerk');
          console.warn(error.message);
          processRefreshQueue(null, error);
          throw error;
        }

        tokenRef.current = newToken;

        // use exp claim (in seconds) if available
        if (sessionClaims?.exp) {
          expiryRef.current = sessionClaims.exp * 1000;
        } else {
          // fallback TTL
          expiryRef.current = now + 60 * 1000;
        }

        processRefreshQueue(newToken, null);
        return newToken;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Token refresh failed');
        setAuthError(err);
        processRefreshQueue(null, err);
        throw err;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [sessionClaims, getClerkToken, processRefreshQueue]);

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
      const error =
        err instanceof Error ? err : new Error('Profile fetch failed');
      setAuthError(error);
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
    void fetchProfile();
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

  return (
    <IAMContext.Provider value={value}>
      <AuthenticationErrorHandler error={authError}>
        {children}
      </AuthenticationErrorHandler>
    </IAMContext.Provider>
  );
};

/**
 * Hook to consume the IAM context
 */
export const useIAM = () => {
  const ctx = useContext(IAMContext);
  if (!ctx) throw new Error('useIAM must be used within IAMProvider');
  return ctx;
};
