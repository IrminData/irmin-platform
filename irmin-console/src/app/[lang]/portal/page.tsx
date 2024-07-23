'use client';

import React, { useState } from 'react';

import WorkspaceService from '@/lib/api/WorkspaceService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import PortalTitle from '@/components/portalTitle';
import WorkspaceCard from '@/components/workspaceCard';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

const ManageWorkspaces: React.FC = () => {
  const { locale } = useLocale();
  const { workspaces, fetchWorkspaces, workspaceLoading } = useWorkspace();
  const workspaceService = WorkspaceService.getInstance(locale);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate new workspace name
    if (!newWorkspaceName) {
      setError('Workspace name is required');
      return;
    }
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
    <>
      <PortalTitle
        title='Manage your workspaces'
        props={{
          className: 'text-center mx-auto',
        }}
      />
      <div className='container mx-auto px-4 pb-28 pt-4'>
        {!workspaces && (
          <>
            <p className='text-center text-lg font-light text-irmin_black'>
              Loading workspaces...
            </p>
            <LoadingSpinner />
          </>
        )}
        {workspaces && (
          <div className='mx-auto max-w-sm'>
            <p className='mb-4 block text-center font-normal text-gray-400'>
              Create a workspace
            </p>
            <form
              onSubmit={handleCreateWorkspace}
              className={`${workspaceLoading && 'blur-sm'}`}
            >
              <Input
                variant='solid'
                colorScheme='secondary'
                size='md'
                type='text'
                id='newWorkspaceName'
                placeholder='Workspace Name'
                onChange={(e) => setNewWorkspaceName(e.target.value ?? '')}
                required
                ariaLabel='Workspace Name'
                className='mb-6 w-full'
              />
              {error && <p className='mb-4 text-red-800'>{error}</p>}
              {success && <p className='mb-4 text-irmin_green'>{success}</p>}
              <Button
                variant='outline'
                colorScheme='secondary'
                className='mb-6 w-full'
                type='submit'
                ariaLabel='Create Workspace'
                disabled={loading || workspaceLoading}
                loading={loading}
              >
                Create a workspace
              </Button>
            </form>
          </div>
        )}
        <hr className='mx-auto my-4 max-w-sm border-gray-200 shadow-sm' />
        {workspaces && workspaces.length > 0 && (
          <>
            <p className='mb-4 block text-center font-normal text-gray-400'>
              Or select an existing workspace
            </p>
            <div
              className={`grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4 ${workspaceLoading && 'blur-sm'}`}
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
                  connectionCount={Math.floor(Math.random() * 30)}
                  datasetCount={Math.floor(Math.random() * 30)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ManageWorkspaces;
