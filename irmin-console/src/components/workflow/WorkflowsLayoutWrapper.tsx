'use client';

import { useMemo } from 'react';

import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
  TbRun,
} from 'react-icons/tb';

import Tabs from '@/components/ui/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Layout for the Workflow pages in the Console
 */
export default function WorkflowsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dict } = useLocale();

  // The base URL for the workflow, eg. /en/console/workspace-slug/workflows
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'workflows',
    includeSegment: true,
  });

  const tabs = useMemo(
    () => [
      {
        icon: <TbRun />,
        name: dict.workflow.allWorkflows,
        slug: 'all-workflows',
        link: `${baseUrl}`,
      },
      {
        icon: <TbPlayerPlay />,
        name: dict.consoleNavigation.links.actions,
        slug: 'action-workflows',
        link: `${baseUrl}/actions`,
      },
      {
        icon: <TbDatabaseImport />,
        name: dict.consoleNavigation.links.imports,
        slug: 'import-workflows',
        link: `${baseUrl}/imports`,
      },
      {
        icon: <TbDatabaseExport />,
        name: dict.consoleNavigation.links.exports,
        slug: 'export-workflows',
        link: `${baseUrl}/exports`,
      },
    ],
    [dict, baseUrl]
  );
  return (
    <div className='container relative mx-auto max-w-6xl'>
      <Tabs tabs={tabs} />
      <div className='relative'>{children}</div>
    </div>
  );
}
