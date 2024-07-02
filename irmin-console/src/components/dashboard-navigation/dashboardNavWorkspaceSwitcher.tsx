'use client';

import React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

export default function DashboardNavWorkspaceSwitcher({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { currentWorkspace, workspaces, switchToWorkspace, workspaceLoading } =
    useWorkspace();
  const router = useRouter();
  const { irminAlert } = usePopup();
  const { workspace: workspaceSlug } = useParams();

  return (
    <div className='mt-4 block w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-900'>
      <select
        className='w-full bg-gray-50'
        value={
          workspaceSlug && currentWorkspace?.id
            ? currentWorkspace.id
            : 'select-workspace'
        }
        disabled={workspaceLoading}
        onChange={async (e) => {
          try {
            e.preventDefault();
            const value = e.target.value;
            if (value === 'create-new' || value === 'select-workspace') {
              router.push('/app');
              setIsMenuOpen(false);
              return;
            }
            const workspaceID = parseInt(value);
            const newWorkspace = workspaces?.find((w) => w.id === workspaceID);
            if (newWorkspace) {
              if (workspaceLoading) return;
              await switchToWorkspace(newWorkspace.slug);
              irminAlert('success', `Switched to ${newWorkspace.name}`);
              setIsMenuOpen(false);
            }
          } catch (error) {
            console.error('Failed to switch workspace: ', error);
            const errorMessage = (error as Error)?.message ?? '';
            irminAlert('error', 'Failed to switch workspace: ' + errorMessage);
          }
        }}
      >
        <option value={'select-workspace'}>Select workspace</option>
        {workspaces?.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
        <option key={'create-new'} value={'create-new'}>
          Create new workspace
        </option>
      </select>
    </div>
  );
}
