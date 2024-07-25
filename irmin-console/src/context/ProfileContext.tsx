'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import AuthService from '@/lib/api/AuthService';

import { useLocale } from '@/context/LocaleContext';

import { Profile } from '@/types/api/Profile';

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
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useLocale();
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

export const useProfile = () => useContext(ProfileContext);
