'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import AuthService from '@/services/api/AuthService';
import ProfileService from '@/services/api/ProfileService';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Profile } from '@/types/api/Profile';

const IAMContext = createContext<{
  profile: Profile | null;
  isLoading: boolean;
  fetchProfile: () => void;
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
 * Uses the {@link ProfileService} and the {@link AuthService} to interact with the API.
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
  const profileService = ProfileService.getInstance(locale);
  const authService = AuthService.getInstance(locale);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the profile data from the API
   * and set the profile state accordingly
   */
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await profileService.getProfile();
      if (data) {
        setProfile(data.data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [profileService]);

  /**
   * Update the user profile data
   * and refetch the profile data
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
      fetchProfile,
      profileService,
      irminAlert,
      dict.profile.profileUpdatedSuccessfully,
    ]
  );

  /**
   * Logout the user and refetch the profile data
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await authService.logout();

      irminAlert(
        'success',
        result.message ??
          result.metadata?.message ??
          "You've been signed out successfully"
      );

      // Refetch the profile data
      fetchProfile();

      // Redirect is handled by the ProtectedRoute component
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
        router.push('/portal');
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
        router.push('/portal');
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
    fetchProfile();
  }, [fetchProfile]);

  return (
    <IAMContext.Provider
      value={{
        profile,
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
