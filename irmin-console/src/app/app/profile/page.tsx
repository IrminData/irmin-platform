'use client';

import React, { useCallback, useState } from 'react';

import AuthService from '@/lib/api/AuthService';

import AppTitle from '@/components/appTitle';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import SettingsTabs from '@/components/tabs/settingsTabs';

import { usePopup } from '@/context/PopupContext';
import { useProfile } from '@/context/ProfileContext';

export default function UserProfileSettingsPage() {
  return (
    <>
      <AppTitle title='Profile settings' />
      <SettingsTabs
        tabs={[
          { name: 'General', content: <GeneralSettings /> },
          { name: 'Change password', content: <ChangePasswordSettings /> },
        ]}
      />
    </>
  );
}

const GeneralSettings: React.FC = () => {
  const { profile, setProfile } = useProfile();
  const { irminAlert } = usePopup();
  const authService = AuthService.getInstance();

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveChanges = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setIsLoading(true);
      // Get form values
      const form = event.target as HTMLFormElement;
      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
      const email = (form.elements.namedItem('email') as HTMLInputElement)
        .value;
      const company = (form.elements.namedItem('company') as HTMLInputElement)
        .value;

      try {
        // Call the API to update the profile
        await authService.updateProfile(name, company, email);
        // Update the profile context
        const data = await authService.getProfile();
        setProfile(data.data);
        // Reset error and show success message
        setError(null);
        irminAlert('success', 'Profile updated successfully.');
      } catch (error) {
        console.error('Error updating profile:', error);
        setError((error as Error)?.message ?? 'An error occurred.');
      } finally {
        setIsLoading(false);
      }
    },
    [authService, setProfile, setError, irminAlert]
  );

  if (!profile) return <LoadingSkeleton className='h-52 w-full' />;

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-xl font-normal md:text-2xl'>General Settings</h2>
      <form onSubmit={handleSaveChanges} className='pb-8 text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            Name
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
            placeholder='Enter your name'
            defaultValue={profile.name}
            name='name'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            Email
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
            placeholder='Enter your email'
            defaultValue={profile.email}
            name='email'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            Company
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
            placeholder='Enter your company name'
            defaultValue={profile.company ?? ''}
            name='company'
          />
        </div>
        <Button
          className='mt-4 w-full'
          type='submit'
          size='md'
          colorScheme='primary'
          variant='solid'
          disabled={isLoading}
          loading={isLoading}
        >
          Save Changes
        </Button>
        {error && <p className='mt-2 text-red-500'>{error}</p>}
      </form>
    </div>
  );
};

const ChangePasswordSettings: React.FC = () => {
  const handleChangePassword = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Handle changing password
    console.log('Password changed.');
  }, []);

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-xl font-normal md:text-2xl'>Change Password</h2>
      <form onSubmit={handleChangePassword} className='text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-gray-700'>Current Password</label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
            placeholder='Enter your current password'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>New Password</label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
            placeholder='Enter your new password'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Confirm New Password</label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
            placeholder='Confirm your new password'
          />
        </div>

        <Button
          className='mt-4 w-full'
          type='submit'
          size='md'
          colorScheme='primary'
          variant='solid'
        >
          Save Changes
        </Button>
      </form>
    </div>
  );
};
