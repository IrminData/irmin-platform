'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AppTitle from '@/components/appTitle';
import WorkspaceUsersAndPermissions from '@/components/workspaceUsersAndPermissions';
import WorkspaceService from '@/lib/WorkspaceService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Workspace } from '@/types/Workspace';
import { usePopup } from '@/context/PopupContext';
import Modal from '@/components/misc/Modal';

export default function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings openModal={() => setIsModalOpen(true)} />;
      case 'users-permissions':
        return <WorkspaceUsersAndPermissions />;
      case 'billing':
        return <BillingSettings />;
      default:
        return <GeneralSettings openModal={() => setIsModalOpen(true)} />;
    }
  };

  return (
    <>
      <AppTitle title='Workspace settings' />
      <div className='max-w-2xl rounded-lg border-b-2 border-t-2 border-ash_gray bg-white p-8 shadow-md'>
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
              activeTab === 'users-permissions'
                ? 'border-b-2 border-ash_gray text-ash_gray'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('users-permissions')}
          >
            Users & Permissions
          </button>
          <button
            className={`ml-6 px-4 py-2 text-lg font-normal ${
              activeTab === 'billing'
                ? 'border-b-2 border-ash_gray text-ash_gray'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
        </div>
        <div>{renderTabContent()}</div>
      </div>

      {isModalOpen && (
        <DeleteWorkspaceConfirmationModal
          closeModal={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

const GeneralSettings: React.FC<{ openModal: () => void }> = ({
  openModal,
}) => {
  const router = useRouter();
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace } =
    useWorkspace();
  const { irminAlert } = usePopup();

  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const workspaceService = WorkspaceService.getInstance();

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  if (!currentWorkspace) return <></>;

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await workspaceService.updateWorkspace(currentWorkspace.slug, {
        name: workspaceName,
      } as Workspace);
      // Fetch the updated workspace data
      fetchWorkspaces();
      irminAlert('success', 'Workspace updated successfully!');
    } catch (error: any) {
      console.error('Failed to update workspace:', error);
      irminAlert(
        'error',
        error.message ?? 'Failed to update workspace. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className='mb-4 text-2xl font-normal'>General Settings</h2>
      <form onSubmit={handleUpdateWorkspace}>
        <div className='mb-4'>
          <label className='block text-gray-700'>Workspace Name</label>
          <input
            type='text'
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className='mt-2 w-full rounded border p-2'
            placeholder='Enter workspace name'
          />
        </div>
        <button
          type='submit'
          className='cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
      <div className='mt-8'>
        <h3 className='text-xl font-normal text-red-800'>Danger Zone</h3>
        <p className='mt-2 text-gray-700'>
          Deleting your workspace will remove all data associated with it. This
          action is irreversible.
        </p>
        <button
          onClick={openModal}
          className='mt-4 cursor-pointer rounded border border-red-800 px-4 py-2 text-red-800 transition-all hover:bg-red-600 hover:text-white'
        >
          Delete Workspace
        </button>
      </div>
    </div>
  );
};
const DeleteWorkspaceConfirmationModal: React.FC<{
  closeModal: () => void;
}> = ({ closeModal }) => {
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace } =
    useWorkspace();
  const workspaceService = WorkspaceService.getInstance();
  const router = useRouter();
  if (!currentWorkspace) return <></>;
  const handleDelete = async () => {
    closeModal();
    // Handle the deletion of the workspace
    await workspaceService.deleteWorkspace(currentWorkspace.slug);
    // Remove from workspace context
    fetchWorkspaces();
    setCurrentWorkspace(null);
    // Redirect to the app page
    router.push('/app');
  };

  return (
    <Modal isOpen={true} title='Confirm Deletion' onClose={closeModal}>
      <p className='mb-4'>
        Are you sure you want to delete this workspace? This action cannot be
        undone and will remove all data associated with this workspace.
      </p>
      <div className='flex justify-end'>
        <button
          onClick={closeModal}
          className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-500'
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className='rounded bg-red-800 px-4 py-2 text-white transition-all hover:bg-red-500'
        >
          Delete
        </button>
      </div>
    </Modal>
  );
};

const BillingSettings: React.FC = () => (
  <div className='pb-4'>
    <h2 className='mb-4 text-2xl font-normal'>Billing Settings</h2>
    <p className='font-normal text-gray-700'>
      You can currently only manage billing by contacting our team.
    </p>
    <Link href={'/contact'}>
      <p className='mt-4 cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'>
        Contact Us
      </p>
    </Link>
  </div>
);
