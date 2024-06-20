'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, UserProfileAPIResponse } from '@/types/UserProfile';

const ProfileContext = createContext<{
  profile: User | null;
  isLoading: boolean;
  fetchProfile: () => void;
}>({
  profile: null,
  isLoading: true,
  fetchProfile: () => {},
});

const fetchProfileData = async (): Promise<UserProfileAPIResponse> => {
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
    setIsLoading(true);
    try {
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
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
