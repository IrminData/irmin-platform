'use client';

import React, { useState } from 'react';

import AuthService from '@/lib/api/AuthService';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import PortalTitle from '@/components/portalTitle';
import SettingsTabs from '@/components/tabs/settingsTabs';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useProfile } from '@/context/ProfileContext';

/**
 * Portal user profile and settings page
 *
 * @remarks
 *
 * This page is used to manage user profile settings.
 *
 * @returns UI for managing user profile settings
 */
export default function UserProfileSettingsPage() {
  const { dict } = useLocale();
  return (
    <>
      <PortalTitle title={dict.profile.profileSettings} />
      <SettingsTabs
        tabs={[
          {
            slug: 'general',
            name: dict.profile.general,
            content: <GeneralSettings />,
          },
          {
            slug: 'change-password',
            name: dict.profile.changePassword,
            content: <ChangePasswordSettings />,
          },
        ]}
      />
    </>
  );
}

/**
 * General settings tab content
 *
 * @remarks
 *
 * This component is used to manage user's general settings in the portal.
 * It allows the user to change their profile information.
 *
 * It uses the ProfileContext to manage the profile's global state.
 * It uses AuthService to call the API to update the profile.
 *
 * @returns UI to manage user's general settings in the portal
 */
const GeneralSettings: React.FC = () => {
  const { locale, dict } = useLocale();
  const { profile, setProfile } = useProfile();
  const { irminAlert } = usePopup();
  const authService = AuthService.getInstance(locale);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    // Get form values
    const form = event.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const company = (form.elements.namedItem('company') as HTMLInputElement)
      .value;

    try {
      // Call the API to update the profile
      await authService.updateProfile(name, company, email);
      // Update the profile context
      const data = await authService.getProfile();
      if (!data) throw new Error('User not logged in.');
      setProfile(data.data);
      // Reset error and show success message
      setError(null);
      irminAlert('success', dict.profile.profileUpdatedSuccessfully);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError((error as Error)?.message ?? 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return <LoadingSkeleton className='h-52 w-full' />;

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-xl font-normal md:text-2xl'>
        {dict.profile.generalSettings}
      </h2>
      <LanguageSwitcher
        className={`my-4 block overflow-hidden text-nowrap rounded border border-irmin_green bg-white px-4 py-2 text-xs font-light text-irmin_black shadow-sm transition-all lg:text-sm xl:text-base`}
      />
      <form onSubmit={handleSaveChanges} className='pb-8 text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            {dict.profile.name}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
            defaultValue={profile.name}
            name='name'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            {dict.profile.email}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
            defaultValue={profile.email}
            name='email'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm text-gray-700 md:text-base'>
            {dict.profile.company}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='text'
            className='mt-2 w-full'
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
          {dict.profile.saveChanges}
        </Button>
        {error && <p className='mt-2 text-red-500'>{error}</p>}
      </form>
    </div>
  );
};

/**
 * Change password settings tab content
 *
 * @remarks
 * @todo This component is not yet implemented.
 *
 * @returns UI to manage user's password settings in the portal
 */
const ChangePasswordSettings: React.FC = () => {
  const { dict } = useLocale();

  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Handle changing password
  };

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-xl font-normal md:text-2xl'>
        {dict.profile.changePassword}
      </h2>
      <form onSubmit={handleChangePassword} className='text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-gray-700'>
            {dict.profile.currentPassword}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>
            {dict.profile.newPassword}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>
            {dict.profile.confirmNewPassword}
          </label>
          <Input
            variant='outline'
            colorScheme='primary'
            type='password'
            className='mt-2 w-full'
          />
        </div>

        <Button
          className='mt-4 w-full'
          type='submit'
          size='md'
          colorScheme='primary'
          variant='solid'
        >
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};
