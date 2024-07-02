'use client';

import React, { useCallback, useEffect, useState } from 'react';

import WorkspaceService from '@/lib/api/WorkspaceService';

import AppTitle from '@/components/appTitle';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import SettingsTabs from '@/components/tabs/settingsTabs';
import WorkspaceUsersAndPermissions from '@/components/workspaceUsersAndPermissions';

import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/Workspace';

export default function WorkspaceSettingsPage() {
  return (
    <>
      <AppTitle title='Workspace settings' />
      <SettingsTabs
        tabs={[
          {
            name: 'General',
            content: <GeneralSettings />,
          },
          {
            name: 'Users',
            content: <WorkspaceUsersAndPermissions />,
          },
          { name: 'Billing', content: <BillingSettings /> },
        ]}
      />
    </>
  );
}

const GeneralSettings = () => {
  const { irminModal } = usePopup();
  const { currentWorkspace, fetchWorkspaces, deleteCurrentWorkspace } =
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

  const handleUpdateWorkspace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentWorkspace) return;
      setIsLoading(true);
      try {
        // Call the API to update the workspace
        await workspaceService.updateWorkspace(currentWorkspace.slug, {
          name: workspaceName,
        } as Workspace);
        // Fetch the updated workspace data
        await fetchWorkspaces();
        // Show success message
        irminAlert('success', 'Workspace updated successfully!');
      } catch (error) {
        console.error('Failed to update workspace:', error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Failed to update workspace. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      workspaceService,
      currentWorkspace,
      workspaceName,
      fetchWorkspaces,
      irminAlert,
    ]
  );

  const confirmDeletion = useCallback(() => {
    if (!currentWorkspace) return;

    const handleDelete = async () => {
      try {
        await deleteCurrentWorkspace();
        irminAlert('success', 'Workspace deleted successfully');
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        const errorMessage = (error as Error)?.message ?? '';
        irminAlert('error', 'Failed to delete workspace: ' + errorMessage);
      }
    };

    irminModal.show(
      'Confirm Deletion',
      <div>
        <p className='mb-4'>
          Are you sure you want to delete this workspace? This action cannot be
          undone and will remove all data associated with this workspace.
        </p>
        <div className='flex justify-end'>
          <Button
            onClick={() => {
              irminModal.close();
            }}
            className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-500'
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete()}
            className='rounded bg-red-800 px-4 py-2 text-white transition-all hover:bg-red-500'
          >
            Delete
          </Button>
        </div>
      </div>,
      () => {}
    );
  }, [currentWorkspace, irminModal, deleteCurrentWorkspace, irminAlert]);

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-2xl font-normal'>General Settings</h2>
      <form onSubmit={handleUpdateWorkspace}>
        <div>
          <label className='mb-4 block text-gray-700'>Workspace Name</label>
          <Input
            variant='outline'
            colorScheme='black'
            size='md'
            required
            className='w-full'
            ariaLabel='Your workspace name'
            type='text'
            defaultValue={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder='Enter workspace name'
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
      </form>
      <div className='mt-8'>
        <h3 className='text-xl font-normal text-red-800'>Danger Zone</h3>
        <p className='mt-2 text-gray-700'>
          Deleting your workspace will remove all data associated with it. This
          action is irreversible.
        </p>
        <Button
          className='mt-4'
          onClick={confirmDeletion}
          size='sm'
          colorScheme='secondary'
          variant='outline'
        >
          Delete Workspace
        </Button>
      </div>
    </div>
  );
};

const BillingSettings: React.FC = () => (
  <div className='px-4 pb-4'>
    <h2 className='mb-4 text-2xl font-normal'>Billing Settings</h2>
    <p className='mb-4 font-normal text-gray-700'>
      You can currently only manage billing by contacting our team.
    </p>
    <Button
      href={'/contact'}
      size='sm'
      colorScheme='primary'
      variant='outline'
      className='w-48'
    >
      Contact Us
    </Button>
  </div>
);
