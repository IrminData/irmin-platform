'use client';

import React, { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import Select from '@/components/common/select/Select';

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

  const [processing, setProcessing] = useState(false);
  const loading = workspacesLoading || processing;

  const currentValue =
    workspaceSlug &&
    currentWorkspace?.slug &&
    workspaceSlug === currentWorkspace.slug
      ? currentWorkspace.slug
      : 'select-workspace';

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      e.preventDefault();
      setProcessing(true);
      const value = e.target.value;
      if (value === 'create-new' || value === 'select-workspace') {
        router.push('/portal/manage-workspaces');
        setIsMenuOpen(false);
        return;
      }
      const newWorkspace = workspaces?.find((w) => w.slug === value);
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
  };

  return (
    <div className='mt-4' id='portal-nav-workspace-switcher'>
      <Select
        label={dict.workspaceSwitcher.selectWorkspace}
        onChange={onChange}
        loading={loading}
        currentValue={currentValue}
        defaultValue={'select-workspace'}
        labelClass='text-[10px] font-medium uppercase text-gray-400'
        options={[
          {
            value: 'select-workspace',
            label: dict.workspaceSwitcher.selectWorkspace,
          },
          ...(workspaces?.map((w) => ({
            value: w.slug,
            label: w.name,
          })) ?? []),
          {
            value: 'create-new',
            label: dict.workspaceSwitcher.createNewWorkspace,
          },
        ]}
      />
    </div>
  );
}
