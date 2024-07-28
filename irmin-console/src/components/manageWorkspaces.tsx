'use client';

import React, { useState } from 'react';

import WorkspaceService from '@/lib/api/WorkspaceService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import WorkspaceCard from '@/components/workspaceCard';

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
 * It uses the {@link WorkspaceService} to create new workspaces.
 * It uses the {@link useWorkspace} Context to fetch and manage workspace data.
 *
 * @todo The workspace card shows dummy data for now. This should be replaced with real data.
 *
 * @returns UI for managing workspaces
 */
const ManageWorkspaces: React.FC = () => {
  const { locale, dict } = useLocale();
  const { workspaces, fetchWorkspaces, workspaceLoading } = useWorkspace();
  const workspaceService = WorkspaceService.getInstance(locale);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Reset error and success messages
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Create new workspace
    try {
      const response = await workspaceService.createWorkspace(newWorkspaceName);
      if (response.metadata?.message) {
        await fetchWorkspaces();
        setSuccess(response.metadata.message);
        setNewWorkspaceName('');
      } else {
        throw new Error(response.message || 'Creation failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 pb-28 pt-4'>
      {!workspaces && (
        <>
          <p className='text-center text-lg font-light text-irmin_black'>
            {dict.misc.loading}
          </p>
          <LoadingSpinner />
        </>
      )}
      {workspaces && (
        <div className='mx-auto max-w-sm'>
          <p className='mb-4 block text-center text-sm font-normal text-irmin_black opacity-40 md:text-base'>
            {dict.workspaceSwitcher.createNewWorkspace}
          </p>
          <form
            onSubmit={handleCreateWorkspace}
            className={`${workspaceLoading && 'blur-sm'}`}
          >
            <Input
              variant='solid'
              colorScheme='secondary'
              size='sm'
              type='text'
              id='newWorkspaceName'
              placeholder={dict.workspaceSwitcher.workspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value ?? '')}
              required
              className='mb-2 h-11 w-full md:mb-6'
            />
            {error && <p className='mb-4 text-red-800'>{error}</p>}
            {success && <p className='mb-4 text-irmin_green'>{success}</p>}
            <Button
              variant='solid'
              colorScheme='primary'
              size='sm'
              className='mb-6 h-10 w-full'
              type='submit'
              disabled={loading || workspaceLoading}
              loading={loading}
            >
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </form>
        </div>
      )}
      <hr className='mx-auto my-4 max-w-sm border-irmin_black opacity-10 shadow-sm' />
      {workspaces && workspaces.length > 0 && (
        <>
          <p className='mb-4 block text-center text-sm font-normal text-irmin_black opacity-40 md:text-base'>
            {dict.workspaceSwitcher.orSelectExisting}
          </p>
          <div
            className={`grid w-full grid-cols-2 gap-2 lg:grid-cols-3 xl:gap-4 ${workspaceLoading && 'blur-sm'}`}
          >
            {workspaces.map((workspace, idx) => (
              <WorkspaceCard
                key={`select-workspace-card-${idx}`}
                workspace={workspace}
                description='Marketing, engineering, sales, and customer success teams collaborate here to drive growth.'
                users={[
                  {
                    name: 'John Doe',
                    avatar: '/ui-assets/images/blog/avatar.png',
                  },
                  {
                    name: 'Jane Doe',
                    avatar: '/ui-assets/images/blog/avatar.png',
                  },
                  {
                    name: 'John Smith',
                    avatar: '/ui-assets/images/blog/avatar.png',
                  },
                  {
                    name: 'Haz Johnson',
                    avatar: '/ui-assets/images/blog/avatar.png',
                  },
                  {
                    name: 'Tim Borovkov',
                    avatar: '/ui-assets/images/blog/avatar.png',
                  },
                ]}
                actionCount={0}
                connectionCount={0}
                datasetCount={0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ManageWorkspaces;
