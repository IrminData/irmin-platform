'use client';

import { useMemo } from 'react';

import { RiFlowChart } from 'react-icons/ri';
import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
  TbRun,
} from 'react-icons/tb';

import Tabs from '@/components/ui/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

import { useBaseUrl } from '@/hooks/utils';

/**
 * Layout for the Workflow pages in the Console
 */
export default function WorkflowsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dict } = useLocale();

  // The base URL for the workflow, eg. /en/workspace/workspace-slug/workflows
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'workflows',
    includeSegment: true,
  });

  const tabs = useMemo(
    () => [
      {
        icon: <TbRun />,
        name: dict.workflow.workflows,
        slug: 'all-workflows',
        link: `${baseUrl}`,
      },
      {
        icon: <TbPlayerPlay />,
        name: dict.workflow.actions,
        slug: 'action-workflows',
        link: `${baseUrl}/actions`,
      },
      {
        icon: <TbDatabaseImport />,
        name: dict.workflow.imports,
        slug: 'import-workflows',
        link: `${baseUrl}/imports`,
      },
      {
        icon: <TbDatabaseExport />,
        name: dict.workflow.exports,
        slug: 'export-workflows',
        link: `${baseUrl}/exports`,
      },
      {
        icon: <RiFlowChart />,
        name: dict.workflow.pipelines,
        slug: 'pipeline-workflows',
        link: `${baseUrl}/pipelines`,
      },
      {
        icon: <TbPlayerPlay />,
        name: dict.list.runs,
        slug: 'workflow-runs',
        link: `${baseUrl}/runs`,
      },
    ],
    [dict, baseUrl]
  );
  return (
    <div className='relative container mx-auto max-w-7xl'>
      <Tabs tabs={tabs} />
      <div className='relative'>{children}</div>
    </div>
  );
}
