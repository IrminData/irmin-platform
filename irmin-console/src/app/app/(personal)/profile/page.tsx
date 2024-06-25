'use client';

import React, { useState } from 'react';
import AppTitle from '@/components/appTitle';
import { useProfile, fetchProfileData } from '@/context/ProfileContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import AuthService from '@/lib/AuthService';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

export default function UserProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'change-password':
        return <ChangePasswordSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <>
      <AppTitle title='Profile settings' />
      <div className='max-w-2xl rounded-lg border-t-2 border-ash_gray bg-white p-8 shadow-md'>
        <div className='mb-6 flex border-b'>
          <button
            className={`px-4 py-2 text-lg font-normal ${
              activeTab === 'general'
                ? 'border-b-2 border-ash_gray text-ash_gray'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`ml-6 px-4 py-2 text-lg font-normal ${
              activeTab === 'change-password'
                ? 'border-b-2 border-ash_gray text-ash_gray'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('change-password')}
          >
            Change Password
          </button>
        </div>
        <div>{renderTabContent()}</div>
      </div>
    </>
  );
}

const GeneralSettings: React.FC = () => {
  const { profile, setProfile } = useProfile();
  const { irminAlert } = useWorkspace();
  const authService = AuthService.getInstance();

  const [error, setError] = useState<string | null>(null);

  const handleSaveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
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
      const data = await fetchProfileData();
      setProfile(data.data);
      // Reset error and show success message
      setError(null);
      irminAlert('success', 'Profile updated successfully.');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message ?? 'An error occurred.');
    }
  };

  if (!profile) return <LoadingSpinner />;

  return (
    <div>
      <h2 className='mb-4 text-2xl font-normal'>General Settings</h2>
      <form onSubmit={handleSaveChanges}>
        <div className='mb-4'>
          <label className='block text-gray-700'>Name</label>
          <input
            type='text'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your name'
            defaultValue={profile.name}
            name='name'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Email</label>
          <input
            type='email'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your email'
            defaultValue={profile.email}
            name='email'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Company</label>
          <input
            type='text'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your company name'
            defaultValue={profile.company ?? ''}
            name='company'
          />
        </div>
        <button
          type='submit'
          className='cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'
        >
          Save Changes
        </button>
        {error && <p className='mt-2 text-red-500'>{error}</p>}
      </form>
    </div>
  );
};

const ChangePasswordSettings: React.FC = () => {
  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    // Handle changing password
    console.log('Password changed.');
  };

  return (
    <div>
      <h2 className='mb-4 text-2xl font-normal'>Change Password</h2>
      <form onSubmit={handleChangePassword}>
        <div className='mb-4'>
          <label className='block text-gray-700'>Current Password</label>
          <input
            type='password'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your current password'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>New Password</label>
          <input
            type='password'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your new password'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Confirm New Password</label>
          <input
            type='password'
            className='mt-2 w-full rounded border p-2'
            placeholder='Confirm your new password'
          />
        </div>
        <button
          type='submit'
          className='cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'
        >
          Change Password
        </button>
      </form>
    </div>
  );
};
