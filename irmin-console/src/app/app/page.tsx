'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceService from '@/lib/WorkspaceService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Workspace } from '@/types/Workspace';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

const ManageWorkspaces: React.FC = () => {
  const router = useRouter();
  const { workspaces, setCurrentWorkspace, fetchWorkspaces } = useWorkspace();
  const workspaceService = WorkspaceService.getInstance();
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
    } catch (error: any) {
      setError(error?.message ?? 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    setError(null);
    setSuccess(null);
    try {
      const newWorkspace = await workspaceService.switchWorkspace(
        workspace.slug
      );
      if (newWorkspace) {
        setCurrentWorkspace(newWorkspace);
        router.push(`/app/${newWorkspace.slug}/dashboards`);
      } else {
        throw new Error('Switching workspace failed');
      }
    } catch (error: any) {
      setError(error?.message ?? 'Switching workspace failed');
    }
  };

  return (
    <div className='container mx-auto px-4 py-12 md:py-24'>
      {workspaces && workspaces.length > 0 && (
        <>
          <div className='mx-auto max-w-sm'>
            <p className='mb-4 block text-center font-light text-rich_black'>
              Select an existing workspace
            </p>
            {workspaces ? (
              workspaces.length > 0 ? (
                workspaces.map((workspace) => (
                  <div key={workspace.id} className='mb-4'>
                    <div
                      className='w-full cursor-pointer rounded-full border border-gray-500 px-7 py-3 text-base font-medium leading-6 text-gray-500 shadow-sm transition-all hover:border-ash_gray hover:text-ash_gray focus:outline-none'
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectWorkspace(workspace);
                      }}
                      aria-label={`Go to ${workspace.name}`}
                    >
                      {workspace.name}
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-lg font-light text-rich_black'>
                  No workspaces available.
                </p>
              )
            ) : (
              <>
                <p className='text-lg font-light text-rich_black'>
                  Loading workspaces...
                </p>
                <LoadingSpinner />
              </>
            )}
          </div>

          <hr className='mx-auto my-12 max-w-sm border-gray-200 shadow-sm' />
        </>
      )}

      <div className='mx-auto max-w-sm'>
        <p className='mb-4 block text-center font-light text-rich_black'>
          {workspaces && workspaces.length > 0
            ? 'Or create a new workspace'
            : 'Create a workspace'}
        </p>
        <form onSubmit={handleCreateWorkspace}>
          <div className='mb-6'>
            <input
              className='block w-full appearance-none rounded-full border border-ash_gray p-3 leading-5 text-rich_black placeholder-gray-400 shadow-md focus:outline-none'
              type='text'
              id='newWorkspaceName'
              placeholder='Workspace Name'
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value ?? '')}
              required
            />
          </div>
          {error && <p className='mb-4 text-red-800'>{error}</p>}
          {success && <p className='mb-4 text-ash_gray'>{success}</p>}
          <button
            className='mb-6 inline-block w-full cursor-pointer rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm transition-all hover:bg-ash_gray-600'
            type='submit'
            aria-label='Create Workspace'
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageWorkspaces;
