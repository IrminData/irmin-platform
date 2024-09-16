'use client';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
  TbRun,
} from 'react-icons/tb';

import Tabs from '@/components/common/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout for the Workflow pages in the Portal
 */
export default function WorkflowsLayoutWrapper({
  params,
  children,
}: {
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  return (
    <div className='container relative mx-auto max-w-6xl'>
      <Tabs
        tabs={[
          {
            icon: <TbRun />,
            name: dict.workflow.allWorkflows,
            slug: 'all-workflows',
            link: `/${params.lang}/portal/${params.workspace}/workflows`,
          },
          {
            icon: <TbPlayerPlay />,
            name: dict.portalNavigation.links.actions,
            slug: 'action-workflows',
            link: `/${params.lang}/portal/${params.workspace}/workflows/actions`,
          },
          {
            icon: <TbDatabaseImport />,
            name: dict.portalNavigation.links.imports,
            slug: 'import-workflows',
            link: `/${params.lang}/portal/${params.workspace}/workflows/imports`,
          },
          {
            icon: <TbDatabaseExport />,
            name: dict.portalNavigation.links.exports,
            slug: 'export-workflows',
            link: `/${params.lang}/portal/${params.workspace}/workflows/exports`,
          },
        ]}
      />
      <div className='relative'>{children}</div>
    </div>
  );
}
