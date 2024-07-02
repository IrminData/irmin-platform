'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import AuthService from '@/lib/api/AuthService';
import { offlineUser } from '@/lib/offlineObjects';

import { User } from '@/types/UserProfile';

const ProfileContext = createContext<{
  profile: User | null;
  isLoading: boolean;
  fetchProfile: () => void;
  setProfile: (_profile: User) => void;
}>({
  profile: null,
  isLoading: true,
  fetchProfile: () => {},
  setProfile: () => {},
});

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const auth = AuthService.getInstance();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the profile data
  const fetchProfile = useCallback(async () => {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      setProfile(offlineUser);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await auth.getProfile();
      setProfile(data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  /**
   * Fetch the profile data on component mount only
   * */
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
