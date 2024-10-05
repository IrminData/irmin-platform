'use client';

import React, { useState } from 'react';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';

import { SingleValue } from 'react-select';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

const ReactSelect = dynamic(() => import('react-select'), {
  loading: () => <LoadingSkeleton className='h-8' />,
});

/**
 * Workspace switcher UI for the console navigation sidebar
 */
export default function ConsoleNavigationWorkspaceSwitcher({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { dict } = useLocale();
  const {
    workspaceLoading,
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
  const loading = workspacesLoading || workspaceLoading;

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
        router.push('/console/manage-workspaces');
        setIsMenuOpen(false);
        return;
      }
      const newWorkspace = workspaces?.find((w) => w.slug === value);
      if (newWorkspace) {
        const res = await switchWorkspace(newWorkspace.slug);
        irminAlert(
          'success',
          res?.message ??
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
  const currentValue =
    workspaceSlug &&
    currentWorkspace?.slug &&
    workspaceSlug === currentWorkspace.slug
      ? { value: currentWorkspace.slug, label: currentWorkspace.name }
      : {
          value: 'select-workspace',
          label: dict.workspaceSwitcher.selectWorkspace,
        };

  return (
    <div className='mt-2' id='console-nav-workspace-switcher'>
      {loading || !workspaces ? (
        <></>
      ) : (
        <ReactSelect
          options={options}
          onChange={(newValue) => {
            onChange(newValue as SingleValue<{ value: string; label: string }>);
          }}
          isLoading={processing}
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
      )}
    </div>
  );
}
