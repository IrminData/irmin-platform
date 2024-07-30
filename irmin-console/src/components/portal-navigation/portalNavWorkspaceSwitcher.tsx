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
  const {
    workspaces: { currentWorkspace, workspaces, switchToWorkspace },
    workspaceLoading,
  } = useWorkspace();
  const router = useRouter();
  const { irminAlert } = usePopup();
  const { workspace: workspaceSlug } = useParams();

  return (
    <div className='mt-4 block w-full cursor-pointer rounded-lg border border-irmin_green border-opacity-20 bg-irmin_green bg-opacity-0 px-4 py-2 text-sm font-light text-irmin_green transition-all hover:bg-opacity-10'>
      <select
        className='w-full cursor-pointer rounded-lg bg-transparent focus:border-0 focus:outline-none focus:ring-0'
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
