'use client';

import React, { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import ReactSelect, { SingleValue } from 'react-select';

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
      ? { value: currentWorkspace.slug, label: currentWorkspace.name }
      : {
          value: 'select-workspace',
          label: dict.workspaceSwitcher.selectWorkspace,
        };

  const onChange = async (
    selectedOption: SingleValue<{
      value: string;
      label: string;
    }>
  ) => {
    try {
      if (!selectedOption || !selectedOption.value) return;
      setProcessing(true);
      const value = selectedOption.value;
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

  const options = [
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
  ];

  return (
    <div className='mt-2' id='portal-nav-workspace-switcher'>
      <ReactSelect
        options={options}
        onChange={onChange}
        isLoading={loading}
        isClearable={false}
        value={currentValue}
        defaultValue={{
          value: 'select-workspace',
          label: dict.workspaceSwitcher.selectWorkspace,
        }}
        noOptionsMessage={() => dict.misc.noOptionsMessage}
        className='react-select-container'
        classNamePrefix='react-select'
      />
    </div>
  );
}
