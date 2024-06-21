'use client';

import React, { useState } from 'react';
import AppTitle from '@/components/appTitle';

export default function UserProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings openModal={() => setIsModalOpen(true)} />;
      case 'change-password':
        return <ChangePasswordSettings />;
      default:
        return <GeneralSettings openModal={() => setIsModalOpen(true)} />;
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

      {isModalOpen && (
        <ConfirmationModal closeModal={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

const GeneralSettings: React.FC<{ openModal: () => void }> = ({
  openModal,
}) => {
  const handleSaveChanges = (event: React.FormEvent) => {
    event.preventDefault();
    // Handle saving changes
    console.log('Changes saved.');
  };

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
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Email</label>
          <input
            type='email'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your email'
          />
        </div>
        <div className='mb-4'>
          <label className='block text-gray-700'>Company</label>
          <input
            type='text'
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter your company name'
          />
        </div>
        <button
          type='submit'
          className='cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'
        >
          Save Changes
        </button>
      </form>
      <div className='mt-8'>
        <h3 className='text-xl font-normal text-red-800'>Danger Zone</h3>
        <p className='mt-2 text-gray-700'>
          Deleting your account will remove all data associated with it. This
          action is irreversible.
        </p>
        <button
          onClick={openModal}
          className='mt-4 cursor-pointer rounded border border-red-800 px-4 py-2 text-red-800 transition-all hover:bg-red-600 hover:text-white'
        >
          Delete Account
        </button>
      </div>
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

const ConfirmationModal: React.FC<{ closeModal: () => void }> = ({
  closeModal,
}) => {
  const handleDelete = () => {
    // Handle the deletion of the account
    console.log('Account deleted.');
    closeModal();
  };

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50'>
      <div className='rounded-lg bg-white p-8 shadow-lg'>
        <h2 className='mb-4 text-2xl font-semibold'>Confirm Deletion</h2>
        <p className='mb-4'>
          Are you sure you want to delete your account? This action cannot be
          undone and will remove all data associated with your account.
        </p>
        <div className='flex justify-end'>
          <button
            onClick={closeModal}
            className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className='rounded bg-red-500 px-4 py-2 text-white'
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
