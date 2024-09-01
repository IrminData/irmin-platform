'use client';

import React, { useEffect, useState } from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WrappedTabs from '@/components/common/tabs/WrappedTabs';
import PortalTitle from '@/components/portal/PortalTitle';
import UsersAndInvites from '@/components/workspace/UsersAndInvites';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/api/Workspace';

/**
 * Portal Workspace settings page
 *
 * @remarks
 *
 * This page is used to manage workspace settings in the portal.
 * It allows the user to update the workspace name and delete the workspace.
 * It also allows the user to manage users and permissions in the workspace.
 */
export default function WorkspaceSettingsPage() {
  const { dict } = useLocale();
  return (
    <>
      <PortalTitle title={dict.workspace.workspaceSettings} />
      <WrappedTabs
        tabs={[
          {
            slug: 'general',
            name: dict.workspace.general,
            content: <GeneralSettings />,
          },
          {
            slug: 'users',
            name: dict.workspace.users,
            content: <UsersAndInvites />,
          },
          {
            slug: 'billing',
            name: dict.workspace.billing,
            content: <BillingSettings />,
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
 * This component is used to manage workspace's general settings in the portal.
 * It allows the user to update the workspace's basic data, such as name,
 * and delete the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage workspace data.
 */
const GeneralSettings = () => {
  const { dict } = useLocale();
  const { irminModal } = usePopup();
  const {
    workspaceLoading,
    workspaces: {
      currentWorkspace,
      fetchWorkspaces,
      deleteCurrentWorkspace,
      updateWorkspace,
    },
  } = useWorkspace();
  const { irminAlert } = usePopup();

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  const [processing, setIsLoading] = useState(false);
  const isLoading = workspaceLoading || processing;

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setWorkspaceDescription(currentWorkspace.description ?? '');
    }
  }, [currentWorkspace]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      // Call the API to update the workspace
      await updateWorkspace({
        name: workspaceName ?? currentWorkspace.name,
        description: workspaceDescription ?? currentWorkspace.description ?? '',
      } as Workspace);
      // Fetch the updated workspace data
      await fetchWorkspaces();
      // Show success message
      irminAlert('success', dict.workspace.workspaceUpdatedSuccessfully);
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
  };

  const confirmDeletion = () => {
    if (!currentWorkspace) return;

    const handleDelete = async () => {
      try {
        await deleteCurrentWorkspace();
        irminAlert('success', dict.workspace.workspaceDeletedSuccessfully);
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        const errorMessage = (error as Error)?.message ?? '';
        irminAlert('error', 'Failed to delete workspace: ' + errorMessage);
      }
    };

    irminModal.show(
      dict.workspace.confirmDeletion,
      <div>
        <p className='mb-4'>{dict.workspace.deletionWarning}</p>
        <div className='flex justify-end'>
          <Button
            onClick={() => {
              irminModal.close();
            }}
            className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-500'
          >
            {dict.workspace.cancel}
          </Button>
          <Button
            onClick={() => {
              irminModal.close();
              handleDelete();
            }}
            className='rounded bg-red-800 px-4 py-2 text-white transition-all hover:bg-red-500'
          >
            {dict.workspace.delete}
          </Button>
        </div>
      </div>,
      () => {}
    );
  };

  return (
    <div className='my-8 px-4'>
      <h2 className='mb-8 font-display text-xl font-bold sm:text-2xl lg:text-3xl'>
        {dict.workspace.generalSettings}
      </h2>
      <div className='pb-8'>
        <form onSubmit={handleUpdateWorkspace}>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.workspace.workspaceName}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              defaultValue={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className='mt-4'>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.workspace.workspaceDescription}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='w-full'
              type='text'
              defaultValue={workspaceDescription}
              onChange={(e) => setWorkspaceDescription(e.target.value)}
              longtext={{
                rows: 3,
              }}
              disabled={isLoading}
            />
          </div>
          <Button
            className='mt-4 h-11 w-full'
            type='submit'
            size='sm'
            colorScheme='light'
            variant='solid'
            disabled={isLoading}
            loading={isLoading}
          >
            {dict.workspace.saveChanges}
          </Button>
        </form>
        <div className='mt-8'>
          <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
            {dict.workspace.dangerZone}
          </p>
          <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
            {dict.workspace.deletionNote}
          </p>
          <Button
            className='mt-4 dark:bg-gray-800 dark:text-white'
            onClick={confirmDeletion}
            size='sm'
            colorScheme='black'
            variant='outline'
            disabled={isLoading}
          >
            {dict.workspace.deleteWorkspace}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Billing settings tab content
 *
 * @remarks
 *
 * This component is used to manage workspace's billing settings in the portal.
 *
 * Currently Billing is not implemented, thus it only shows a contact us button.
 */
const BillingSettings: React.FC = () => {
  const { dict } = useLocale();
  return (
    <div className='my-8 px-4'>
      <h2 className='mb-8 font-display text-xl font-bold sm:text-2xl lg:text-3xl'>
        {dict.workspace.billingSettings}
      </h2>
      <p className='mb-4 font-normal text-gray-500'>
        {dict.workspace.billingNote}
      </p>
      <Button
        href={'/contact'}
        size='sm'
        colorScheme='primary'
        variant='outline'
        className='w-48'
      >
        {dict.workspace.contactUs}
      </Button>
    </div>
  );
};
