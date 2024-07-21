'use client';

import React, { useCallback, useEffect, useState } from 'react';

import WorkspaceService from '@/lib/api/WorkspaceService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import PortalTitle from '@/components/portalTitle';
import SettingsTabs from '@/components/tabs/settingsTabs';
import WorkspaceUsersAndPermissions from '@/components/workspaceUsersAndPermissions';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/Workspace';

export default function WorkspaceSettingsPage() {
  const { dict } = useLocale();
  return (
    <>
      <PortalTitle title={dict.workspace.workspaceSettings} />
      <SettingsTabs
        tabs={[
          {
            name: dict.workspace.general,
            content: <GeneralSettings />,
          },
          {
            name: dict.workspace.users,
            content: <WorkspaceUsersAndPermissions />,
          },
          { name: dict.workspace.billing, content: <BillingSettings /> },
        ]}
      />
    </>
  );
}

const GeneralSettings = () => {
  const { locale, dict } = useLocale();
  const { irminModal } = usePopup();
  const { currentWorkspace, fetchWorkspaces, deleteCurrentWorkspace } =
    useWorkspace();
  const { irminAlert } = usePopup();

  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const workspaceService = WorkspaceService.getInstance(locale);

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
    },
    [
      workspaceService,
      workspaceName,
      fetchWorkspaces,
      irminAlert,
      dict,
      currentWorkspace,
    ]
  );

  const confirmDeletion = useCallback(() => {
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
            onClick={() => handleDelete()}
            className='rounded bg-red-800 px-4 py-2 text-white transition-all hover:bg-red-500'
          >
            {dict.workspace.delete}
          </Button>
        </div>
      </div>,
      () => {}
    );
  }, [currentWorkspace, irminModal, deleteCurrentWorkspace, irminAlert, dict]);

  return (
    <div className='px-4'>
      <h2 className='mb-4 text-2xl font-normal'>
        {dict.workspace.generalSettings}
      </h2>
      <div className='pb-8'>
        <form onSubmit={handleUpdateWorkspace}>
          <div>
            <label className='mb-4 block text-gray-700'>
              {dict.workspace.workspaceName}
            </label>
            <Input
              variant='outline'
              colorScheme='black'
              size='md'
              required
              className='w-full'
              type='text'
              defaultValue={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
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
            {dict.workspace.saveChanges}
          </Button>
        </form>
        <div className='mt-8'>
          <h3 className='text-xl font-normal text-red-800'>
            {dict.workspace.dangerZone}
          </h3>
          <p className='mt-2 text-gray-700'>{dict.workspace.deletionNote}</p>
          <Button
            className='mt-4'
            onClick={confirmDeletion}
            size='sm'
            colorScheme='secondary'
            variant='outline'
          >
            {dict.workspace.deleteWorkspace}
          </Button>
        </div>
      </div>
    </div>
  );
};

const BillingSettings: React.FC = () => {
  const { dict } = useLocale();
  return (
    <div className='px-4 pb-4'>
      <h2 className='mb-4 text-2xl font-normal'>
        {dict.workspace.billingSettings}
      </h2>
      <p className='mb-4 font-normal text-gray-700'>
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
