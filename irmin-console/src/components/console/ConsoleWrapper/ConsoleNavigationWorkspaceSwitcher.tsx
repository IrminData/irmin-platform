'use client';

import { useCallback, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { SingleValue } from 'react-select';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Workspace } from '@/types/core/Workspace';

const ReactSelect = dynamic(() => import('react-select'), {
  loading: () => <LoadingSkeleton className='h-8' />,
});

/**
 * Workspace switcher UI for the console navigation sidebar
 */
export default function ConsoleNavigationWorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  setIsMenuOpen,
}: {
  workspaces: Workspace[];
  currentWorkspace?: Workspace;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const { irminAlert } = usePopup();

  const [processing, setProcessing] = useState(false);

  const onChange = useCallback(
    async (
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
          router.push(`/${locale}/workspace`);
          setIsMenuOpen(false);
          return;
        }
        setIsMenuOpen(false);
        router.push(`/${locale}/workspace/${value}`);
      } catch (error) {
        console.error('Failed to switch workspace: ', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to switch workspace'
        );
      } finally {
        setProcessing(false);
      }
    },
    [router, irminAlert, setIsMenuOpen, locale]
  );

  const options = useMemo(
    () => [
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
    ],
    [workspaces, dict]
  );

  const currentValue = useMemo(
    () =>
      currentWorkspace
        ? { value: currentWorkspace.slug, label: currentWorkspace.name }
        : {
            value: 'select-workspace',
            label: dict.workspaceSwitcher.selectWorkspace,
          },
    [currentWorkspace, dict]
  );

  return (
    <div className='mt-2' id='console-nav-workspace-switcher'>
      {!workspaces || workspaces.length === 0 ? (
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
          noOptionsMessage={() => dict.common.noOptionsMessage}
          className='react-select-container'
          classNamePrefix='react-select'
        />
      )}
    </div>
  );
}
