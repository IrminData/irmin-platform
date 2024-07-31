'use client';

import React, { useState } from 'react';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import PortalTitle from '@/components/portalTitle';
import SettingsTabs from '@/components/tabs/settingsTabs';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Portal user profile and settings page.
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
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 *
 * @returns UI to manage user's general settings in the portal
 */
const GeneralSettings: React.FC = () => {
  const { dict } = useLocale();
  const { profile, updateProfile } = useIAM();

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

    // Update the profile
    await updateProfile(name, company, email);
    setIsLoading(false);
  };

  if (!profile) return <LoadingSkeleton className='h-52 w-full' />;

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-xl font-normal md:text-2xl'>
        {dict.profile.generalSettings}
      </h2>
      <div className='my-4 w-full max-w-40 rounded-lg border border-gray-400 shadow'>
        <LanguageSwitcher
          className={`block w-full overflow-hidden text-nowrap rounded-lg border-r-4 border-white bg-white py-2 pl-4 pr-3 text-sm font-light text-irmin_black transition-all focus:outline-none lg:text-sm xl:text-base`}
        />
      </div>
      <form onSubmit={handleSaveChanges} className='pb-8 text-sm md:text-base'>
        <div className='mb-4'>
          <label className='block text-xs text-gray-700 md:text-sm'>
            {dict.profile.name}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='text'
            className='mt-2 w-full'
            defaultValue={profile.name}
            name='name'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-700 md:text-sm'>
            {dict.profile.email}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='text'
            className='mt-2 w-full'
            defaultValue={profile.email}
            name='email'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-xs text-gray-700 md:text-sm'>
            {dict.profile.company}
          </label>
          <Input
            size='sm'
            variant='outline'
            colorScheme='gray'
            type='text'
            className='mt-2 w-full'
            defaultValue={profile.company ?? ''}
            name='company'
          />
        </div>
        <Button
          className='mt-4 w-full'
          type='submit'
          size='sm'
          colorScheme='light'
          variant='solid'
          disabled={isLoading}
          loading={isLoading}
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
          <label className='block text-xs text-gray-700 md:text-sm'>
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
          <label className='block text-xs text-gray-700 md:text-sm'>
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
          <label className='block text-xs text-gray-700 md:text-sm'>
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
