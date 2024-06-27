'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/UserProfile';
import { UserProfileAPIResponse } from '@/types/IrminAPIResponse';

const ProfileContext = createContext<{
  profile: User | null;
  isLoading: boolean;
  fetchProfile: () => void;
  setProfile: (profile: User) => void;
}>({
  profile: null,
  isLoading: true,
  fetchProfile: () => {},
  setProfile: () => {},
});

export const fetchProfileData = async (): Promise<UserProfileAPIResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/account/profile`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  return response.json();
};

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the profile data
  const fetchProfile = async () => {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      setProfile({
        id: 0,
        name: 'Offline User',
        company: 'Offline Inc.',
        email: 'work.offline@finnair.com',
        email_verified_at: null,
        created_at: new Date().toDateString(),
        updated_at: new Date().toDateString(),
      });
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchProfileData();
      setProfile(data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
