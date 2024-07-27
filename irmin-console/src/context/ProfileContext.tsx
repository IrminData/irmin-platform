'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Locale } from '@/dictionaries';
import AuthService from '@/lib/api/AuthService';

import { Profile } from '@/types/api/Profile';

/**
 * User profile context
 */
const ProfileContext = createContext<{
  profile: Profile | null;
  isLoading: boolean;
  fetchProfile: () => void;
  setProfile: (_profile: Profile) => void;
}>({
  profile: null,
  isLoading: true,
  fetchProfile: () => {},
  setProfile: () => {},
});

/**
 * Profile context provider
 *
 * @remarks
 *
 * Provider for the profile context to handle user profile data.
 * It fetches the profile data from the API and provides it to the app.
 * The profile data includes user information like name, email, etc.
 */
export const ProfileProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) => {
  const auth = AuthService.getInstance(locale);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the profile data
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await auth.getProfile();
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
  }, [auth]);

  /**
   * Fetch the profile data on component mount only
   */
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        fetchProfile,
        setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

/**
 * Hook to use the profile context
 */
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
