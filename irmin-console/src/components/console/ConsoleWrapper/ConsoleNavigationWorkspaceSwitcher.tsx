'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Workspace } from '@/types/core/Workspace';

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
    async (value: string) => {
      try {
        if (!value) return;
        setProcessing(true);
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

  const currentValue = currentWorkspace
    ? currentWorkspace.slug
    : 'select-workspace';

  if (!workspaces || workspaces.length === 0) {
    return <></>;
  }

  return (
    <div id='console-nav-workspace-switcher'>
      <Select
        value={currentValue}
        onValueChange={onChange}
        disabled={processing}
      >
        <SelectTrigger className='w-full' loading={processing}>
          <SelectValue placeholder={dict.workspaceSwitcher.selectWorkspace} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
