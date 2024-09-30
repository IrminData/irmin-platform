'use client';

import { useMemo } from 'react';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
  TbRun,
} from 'react-icons/tb';

import Tabs from '@/components/common/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout for the Workflow pages in the Console
 */
export default function WorkflowsLayoutWrapper({
  params,
  children,
}: {
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  const tabs = useMemo(
    () => [
      {
        icon: <TbRun />,
        name: dict.workflow.allWorkflows,
        slug: 'all-workflows',
        link: `/${params.lang}/console/${params.workspace}/workflows`,
      },
      {
        icon: <TbPlayerPlay />,
        name: dict.consoleNavigation.links.actions,
        slug: 'action-workflows',
        link: `/${params.lang}/console/${params.workspace}/workflows/actions`,
      },
      {
        icon: <TbDatabaseImport />,
        name: dict.consoleNavigation.links.imports,
        slug: 'import-workflows',
        link: `/${params.lang}/console/${params.workspace}/workflows/imports`,
      },
      {
        icon: <TbDatabaseExport />,
        name: dict.consoleNavigation.links.exports,
        slug: 'export-workflows',
        link: `/${params.lang}/console/${params.workspace}/workflows/exports`,
      },
    ],
    [dict, params.lang, params.workspace]
  );
  return (
    <div className='container relative mx-auto max-w-6xl'>
      <Tabs tabs={tabs} />
      <div className='relative'>{children}</div>
    </div>
  );
}
