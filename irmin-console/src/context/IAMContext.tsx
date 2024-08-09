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

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { setCookie } from '@/utils/cookie';

import { Profile } from '@/types/api/Profile';

const IAMContext = createContext<{
  profile: Profile | null;
  token: string | null;
  isLoading: boolean;
  fetchProfile: (_forceFetch: boolean) => void;
  updateProfile: (_name: string, _company: string, _email: string) => void;
  login: (
    _email: string,
    _password: string,
    _setSuccess: React.Dispatch<React.SetStateAction<string | null>>,
    _setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => void;
  register: (
    _name: string,
    _company: string,
    _email: string,
    _emailConfirmation: string,
    _password: string,
    _passwordConfirmation: string,
    _setSuccess: React.Dispatch<React.SetStateAction<string | null>>,
    _setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => void;
  logout: () => void;
}>({
  profile: null,
  token: null,
  isLoading: true,
  fetchProfile: () => {},
  updateProfile: () => {},
  login: () => {},
  register: () => {},
  logout: () => {},
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
 * Provider for {@link IAMContext} to handle user profile data and authentication.
 * Uses the {@link IrminCore} and the {@link IrminCore} to interact with the API.
 */
export const IAMProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const router = useRouter();

  // Get the needed services
  const { profileService, authService } = useMemo(
    () => new IrminCore(locale),
    [locale]
  );

  // Ref to check if the component has been initialised
  const initialisedRef = useRef(false);

  // Profile data
  const [profile, setProfile] = useState<Profile | null>(null);

  // Loading state, used only for the UI. Don't prevent IAM loads with this
  const [isLoading, setIsLoading] = useState(true);

  // Profile's API token and timestamp
  const [token, setToken] = useState<string | null>(null);
  const [tokenTimestamp, setTokenTimestamp] = useState<string | null>(null);

  /**
   * Fetch the profile data from the API and set the profile state accordingly
   * using the {@link IrminCore}
   */
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      // Regenerate the token
      try {
        await profileService.regenerateToken();
      } catch (error) {
        console.error('Error regenerating token:', error);
      }
      // Fetch the profile data
      const response = await profileService.getProfile();
      if (response) {
        // Update the profile's API token and timestamp if they exist
        if (response.data.api_token) {
          setToken(response.data.api_token ?? null);
          setTokenTimestamp(Date.now().toString());
        } else {
          setToken(null);
          setTokenTimestamp(null);
        }
        // Set cookies
        setCookie(
          'profile',
          JSON.stringify({
            name: response.data.name,
            company: response.data.company,
            email: response.data.email,
            profile_picture: response.data.profile_picture,
          }),
          1
        );

        // Update the profile state
        setProfile(response.data);
      } else {
        // If no profile data is returned, reset the IAM state
        setToken(null);
        setTokenTimestamp(null);
        setProfile(null);
      }
    } catch (error) {
      // If error encountered, reset the IAM state
      setToken(null);
      setTokenTimestamp(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [profileService]);

  /**
   * Update the user profile data and refetch the profile data on success.
   * Shows an alert on success or error.
   */
  const updateProfile = useCallback(
    async (name: string, company: string, email: string) => {
      try {
        setIsLoading(true);
        const result = await profileService.updateProfile(name, company, email);
        irminAlert(
          'success',
          result.message ??
            result.metadata?.message ??
            dict.profile.profileUpdatedSuccessfully
        );
        await fetchProfile();
      } catch (error) {
        console.error('Error updating profile:', error);
        irminAlert(
          'error',
          (error as Error).message ?? 'Failed to update profile'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      profileService,
      fetchProfile,
      irminAlert,
      dict.profile.profileUpdatedSuccessfully,
    ]
  );

  /**
   * Logout the user and refetch the profile data.
   * Shows an alert on success or error.
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      // Handle logout
      const result = await authService.logout();
      // Reset cookies
      setCookie('profile', '', -1);
      setCookie('workspaces', '', -1);
      // Show success message if logout was successful
      irminAlert(
        'success',
        result.message ??
          result.metadata?.message ??
          "You've been signed out successfully"
      );
      // Refetch the profile data
      await fetchProfile();
      // Redirect of unauthorised users is handled by the ProtectedRouteWrapper component
    } catch (error) {
      console.error('Error logging out user:', error);
      irminAlert('error', (error as Error).message ?? 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  }, [authService, fetchProfile, irminAlert]);

  /**
   * Login the user and refetch the profile data
   */
  const login = useCallback(
    async (
      email: string,
      password: string,
      setSuccess: React.Dispatch<React.SetStateAction<string | null>>,
      setError: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
      try {
        setError(null);
        setIsLoading(true);
        const response = await authService.login(email, password);
        setSuccess(
          response.metadata?.message ??
            response.message ??
            'Signed in successfully'
        );
        // Refetch the profile data
        await fetchProfile();
        // Redirect to the portal
        router.push('/portal/manage-workspaces');
      } catch (error) {
        const message = (error as Error).message ?? 'Failed to sign in';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [authService, fetchProfile, router]
  );

  /**
   * Register the user and refetch the profile data
   */
  const register = useCallback(
    async (
      name: string,
      company: string,
      email: string,
      emailConfirmation: string,
      password: string,
      passwordConfirmation: string,
      setSuccess: React.Dispatch<React.SetStateAction<string | null>>,
      setError: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
      try {
        setError(null);
        setIsLoading(true);
        const response = await authService.register(
          name,
          company,
          email,
          emailConfirmation,
          password,
          passwordConfirmation
        );
        setSuccess(
          response.metadata?.message ??
            response.message ??
            'Registered successfully'
        );
        // Refetch the profile data
        await fetchProfile();
        // Redirect to the portal
        router.push('/portal/manage-workspaces');
      } catch (error) {
        const message = (error as Error).message ?? 'Failed to sign up';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [authService, fetchProfile, router]
  );

  /**
   * Fetch the profile data on component mount only
   */
  useEffect(() => {
    // Do not initialise if the component is already initialised
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Refetch token and profile data if they are older than NEXT_PUBLIC_TOKEN_MAX_AGE
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Do not run if the component is not initialised
      if (!initialisedRef.current) return;
      // Check if token and tokenTimestamp
      if (token && tokenTimestamp) {
        const tokenMaxAge = parseInt(
          process.env.NEXT_PUBLIC_TOKEN_MAX_AGE ?? '3600'
        ); // Default to 1 hour if not set
        const tokenAge = (Date.now() - parseInt(tokenTimestamp)) / 1000 / 60;
        if (tokenAge > tokenMaxAge) {
          fetchProfile();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [token, tokenTimestamp, fetchProfile]);

  return (
    <IAMContext.Provider
      value={{
        profile,
        token,
        isLoading,
        fetchProfile,
        updateProfile,
        login,
        register,
        logout,
      }}
    >
      {children}
    </IAMContext.Provider>
  );
};

/**
 * Hook to use the {@link IAMContext}
 */
export const useIAM = () => {
  const context = useContext(IAMContext);
  if (!context) {
    throw new Error('useIAM must be used within a IAMProvider');
  }
  return context;
};
