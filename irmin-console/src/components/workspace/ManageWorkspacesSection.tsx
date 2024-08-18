'use client';

import React, { useState } from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Manage workspces UI
 *
 * @remarks
 *
 * This component is used to manage workspaces in the portal.
 * Here, users can create new workspaces and navigate to existing ones.
 *
 * It uses the {@link useWorkspace} Context to fetch and manage workspace data.
 *
 * @todo The workspace card shows dummy data for now. This should be replaced with real data.
 */
const ManageWorkspacesSection: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaces: {
      workspaces,
      fetchWorkspaces,
      createWorkspace,
      workspacesLoading,
    },
  } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loading = workspacesLoading || processing;

  const handleCreateWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Reset error and success messages
    setProcessing(true);
    setError(null);
    setSuccess(null);
    // Create new workspace
    try {
      const response = await createWorkspace(
        newWorkspaceName,
        newWorkspaceDescription
      );
      if (response.metadata?.message) {
        await fetchWorkspaces();
        setSuccess(response.metadata.message);
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
      } else {
        throw new Error(response.message || 'Creation failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Creation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='flex flex-col gap-4 px-4 pb-28 pt-4 lg:flex-row-reverse'>
      <div className='w-full max-w-80'>
        <div className='rounded-xl bg-white p-2 text-xs shadow sm:p-4 lg:p-6 lg:text-base xl:p-8 dark:bg-irmin_black-600'>
          <p className='mb-4 block text-left text-sm font-medium md:text-base'>
            {dict.workspaceSwitcher.createNewWorkspace}
          </p>
          <form
            onSubmit={handleCreateWorkspace}
            className={`${loading && 'blur-sm'}`}
          >
            <Input
              variant='solid'
              colorScheme='gray'
              size='sm'
              type='text'
              id='newWorkspaceName'
              placeholder={dict.workspace.workspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value ?? '')}
              required
              className='mb-2 h-11 w-full md:mb-4'
              disabled={loading}
            />
            <Input
              variant='solid'
              colorScheme='gray'
              size='sm'
              type='text'
              id='newWorkspaceDescription'
              placeholder={dict.workspace.workspaceDescription}
              onChange={(e) => setNewWorkspaceDescription(e.target.value ?? '')}
              maxLength={255}
              longtext={{
                rows: 3,
              }}
              required
              className='mb-2 w-full md:mb-4'
              disabled={loading}
            />
            {error && <p className='mb-2 text-red-800'>{error}</p>}
            {success && <p className='mb-2 text-irmin_green'>{success}</p>}
            <Button
              variant='gradient'
              colorScheme='primary'
              size='sm'
              className='mb-4 h-11 w-full'
              type='submit'
              disabled={loading}
              loading={loading}
            >
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </form>
        </div>
      </div>
      {workspaces.length > 0 && (
        <div className='ml-auto flex-grow'>
          <div
            className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${loading && 'blur-sm'} -mx-2`}
          >
            {workspaces.map((workspace, idx) => (
              <div
                className='w-full max-w-60 px-2 pb-4'
                key={`select-workspace-card-${idx}`}
              >
                <WorkspaceCard workspace={workspace} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWorkspacesSection;
