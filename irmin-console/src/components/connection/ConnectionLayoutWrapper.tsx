'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import {
  TbFileText,
  TbLogs,
  TbPlug,
  TbSchema,
  TbSettings,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useConnection } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Component to wrap the single Connection pages in.
 */
export default function ConnectionLayoutWrapper({
  children,
  connectionID,
}: {
  children: React.ReactNode;
  connectionID: string;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { connection } = useConnection();

  // The base URL for the connection, eg. /en/workspace/workspace-slug/connections/connection-id
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'connections',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const tabs = useMemo(
    () => [
      {
        name: dict.common.overview,
        link: `${baseUrl}`,
        active: pathname === `${baseUrl}`,
        icon: <GoWorkflow size={14} />,
        hidden: false,
      },
      {
        name: dict.repository.schema.schema,
        link: `${baseUrl}/schema`,
        active: pathname === `${baseUrl}/schema`,
        icon: <TbSchema size={14} />,
        hidden: false,
      },
      {
        name: dict.connectors.connector,
        link: `${baseUrl}/connector`,
        active: pathname === `${baseUrl}/connector`,
        icon: <TbPlug size={14} />,
        hidden: false,
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
        hidden: false,
      },
      {
        name: dict.workflow.tabs.logs,
        link: `${workspaceUrl}/logs/connection/${connectionID}`,
        active: false,
        icon: <TbLogs size={14} />,
        hidden: false,
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hidden: false,
      },
    ],
    [pathname, dict, baseUrl, workspaceUrl, connectionID]
  );

  if (!connection)
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  return (
    <>
      <div className='relative container mx-auto max-w-7xl'>
        <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
          <div className='flex flex-col gap-2 py-4'>
            <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span className='text-xs text-gray-400 md:text-sm'>
                  {dict.connections.connection}
                </span>
                <Badge>{connection.connector.name}</Badge>
              </div>
              <span className='px-2 text-xs text-gray-400 md:text-sm'>
                {dict.list.owner}:{' '}
                {`${connection.owner.first_name} ${connection.owner.last_name}`}
                {connection.owner.company
                  ? ` (${connection.owner.company})`
                  : ''}{' '}
                - {connection.owner.email}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-foreground text-lg font-normal md:text-2xl'>
                {connection.name}
              </h1>
            </div>
            <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
              {connection.description}
            </p>
          </div>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/connections`}
          backTooltip={dict.connections.connections}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
