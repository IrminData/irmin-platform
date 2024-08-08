'use client';

import React from 'react';

import { useParams, useRouter } from 'next/navigation';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Workspace switcher UI for the portal navigation sidebar
 */
export default function PortalNavigationWorkspaceSwitcher({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { dict } = useLocale();
  const {
    workspaces: {
      currentWorkspace,
      workspaces,
      switchWorkspace,
      workspacesLoading,
    },
  } = useWorkspace();

  const router = useRouter();
  const { irminAlert } = usePopup();
  const { workspace: workspaceSlug } = useParams();

  const [processing, setProcessing] = React.useState(false);

  const loading = workspacesLoading || processing;

  const currentValue =
    workspaceSlug &&
    currentWorkspace?.slug &&
    workspaceSlug === currentWorkspace.slug
      ? currentWorkspace.id
      : 'select-workspace';

  return (
    <div className='mt-4' id='portal-nav-workspace-switcher'>
      {currentValue !== 'select-workspace' && !loading && (
        <p className='-mb-2 px-4 text-xs text-irmin_blue'>
          {dict.workspaceSwitcher.selectWorkspace}
        </p>
      )}
      <div className='block w-full cursor-pointer rounded-lg border border-gray-400 border-opacity-20 bg-irmin_green bg-opacity-0 text-sm font-light text-irmin_black transition-all hover:bg-opacity-10'>
        {loading ? (
          <div id='portal-nav-workspace-switcher-loading-skeleton'>
            <LoadingSkeleton className='h-4' />
          </div>
        ) : (
          <div className='px-4 py-3'>
            <select
              className='w-full cursor-pointer bg-transparent focus:border-0 focus:outline-none focus:ring-0'
              value={currentValue}
              disabled={loading}
              onChange={async (e) => {
                try {
                  e.preventDefault();
                  setProcessing(true);
                  const value = e.target.value;
                  if (value === 'create-new' || value === 'select-workspace') {
                    router.push('/portal/manage-workspaces');
                    setIsMenuOpen(false);
                    return;
                  }
                  const workspaceID = parseInt(value);
                  const newWorkspace = workspaces?.find(
                    (w) => w.id === workspaceID
                  );
                  if (newWorkspace) {
                    await switchWorkspace(newWorkspace.slug);
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
                } finally {
                  setProcessing(false);
                }
              }}
            >
              <option value={'select-workspace'}>
                {dict.workspaceSwitcher.selectWorkspace}
              </option>
              {workspaces?.map((w, i) => (
                <option key={`workspace-option-${w.id + i}`} value={w.id}>
                  {w.name}
                </option>
              ))}
              <option key={'create-new'} value={'create-new'}>
                {dict.workspaceSwitcher.createNewWorkspace}
              </option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
