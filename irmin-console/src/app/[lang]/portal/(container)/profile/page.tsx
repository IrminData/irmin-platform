'use client';

import React, { useState } from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import WrappedTabs from '@/components/common/tabs/WrappedTabs';
import PortalTitle from '@/components/portal/PortalTitle';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Portal user profile and settings page.
 */
export default function UserProfileSettingsPage() {
  const { dict } = useLocale();
  return (
    <>
      <PortalTitle title={dict.profile.profileSettings} />
      <WrappedTabs
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
 * Uses {@link useIAM} to interact with the user's identity and APIs
 */
const GeneralSettings: React.FC = () => {
  const { dict } = useLocale();
  const { isLoading, profile, updateProfile } = useIAM();
  const [processing, setProcessing] = useState(false);

  const loading = isLoading || processing || !profile;

  const handleSaveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);

    // Get form values
    const form = event.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const company = (form.elements.namedItem('company') as HTMLInputElement)
      .value;

    // Update the profile
    await updateProfile(name, company, email);
    setProcessing(false);
  };

  return (
    <div className='my-8 px-4'>
      <div className='mb-8 mt-4 flex w-full flex-wrap items-center justify-between gap-2'>
        <h2 className='font-display text-xl font-bold sm:text-2xl lg:text-3xl'>
          {dict.profile.generalSettings}
        </h2>
        <div className='max-w-40'>
          <LanguageSwitcher />
        </div>
      </div>

      <form onSubmit={handleSaveChanges} className='pb-8 text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.name}
          </label>
          {profile && (
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              type='text'
              className='mt-2 w-full'
              defaultValue={profile.name}
              name='name'
              disabled={loading}
            />
          )}
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.email}
          </label>
          {profile && (
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              type='text'
              className='mt-2 w-full'
              defaultValue={profile.email}
              name='email'
              disabled={loading}
            />
          )}
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.company}
          </label>
          {profile && (
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              type='text'
              className='mt-2 w-full'
              defaultValue={profile.company ?? ''}
              name='company'
              disabled={loading}
            />
          )}
        </div>
        <Button
          className='mt-4 w-full'
          type='submit'
          size='sm'
          colorScheme='light'
          variant='solid'
          disabled={loading}
          loading={loading}
        >
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};

/**
 * Change password settings tab content
 * @todo Logic should be implemented to handle changing the user's password
 */
const ChangePasswordSettings: React.FC = () => {
  const { dict } = useLocale();

  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Handle changing password
  };

  return (
    <div className='my-8 px-4'>
      <h2 className='mb-8 font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
        {dict.profile.changePassword}
      </h2>
      <form onSubmit={handleChangePassword} className='text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.currentPassword}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='password'
            className='mt-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.newPassword}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='password'
            className='mt-2 w-full'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.confirmNewPassword}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='password'
            className='mt-2 w-full'
          />
        </div>

        <Button
          className='mt-4 w-full'
          type='submit'
          size='sm'
          colorScheme='light'
          variant='solid'
        >
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};
