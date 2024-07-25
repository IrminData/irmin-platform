'use client';

import React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Workspace switcher UI for the portal navigation sidebar
 */
export default function PortalNavWorkspaceSwitcher({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { dict } = useLocale();
  const { currentWorkspace, workspaces, switchToWorkspace, workspaceLoading } =
    useWorkspace();
  const router = useRouter();
  const { irminAlert } = usePopup();
  const { workspace: workspaceSlug } = useParams();

  return (
    <div className='mt-4 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-900'>
      <select
        className='w-full rounded-lg bg-gray-50'
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
              router.push('/portal');
              setIsMenuOpen(false);
              return;
            }
            const workspaceID = parseInt(value);
            const newWorkspace = workspaces?.find((w) => w.id === workspaceID);
            if (newWorkspace) {
              if (workspaceLoading) return;
              localStorage.setItem('currentWorkspaceSlug', newWorkspace.slug);
              await switchToWorkspace(newWorkspace.slug);
              irminAlert(
                'success',
                `${dict.workspaceSwitcher.switchedTo} ${newWorkspace.name}`
              );
              setIsMenuOpen(false);
            }
          } catch (error) {
            console.error('Failed to switch workspace: ', error);
            const errorMessage = (error as Error)?.message ?? '';
            irminAlert(
              'error',
              `${dict.workspaceSwitcher.failedToSwitch}: ` + errorMessage
            );
          }
        }}
      >
        <option value={'select-workspace'}>
          {dict.workspaceSwitcher.selectWorkspace}
        </option>
        {workspaces?.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
        <option key={'create-new'} value={'create-new'}>
          {dict.workspaceSwitcher.createNewWorkspace}
        </option>
      </select>
    </div>
  );
}
