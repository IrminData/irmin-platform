'use client';

import { useEffect, useMemo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import {
  TbBook,
  TbFileText,
  TbPlug,
  TbSchema,
  TbSettings,
  TbShield,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * Component to wrap the single Connection pages in.
 */
export default function ConnectionLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useLocale();
  const { connectionID, connectionQuery } = useConnectionContext();
  const { isResourceAllowed } = useResourceAllowed();

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

  // Make sure the user is allowed to access the connection
  useEffect(() => {
    if (
      !isResourceAllowed(
        PolicyResource.Connection,
        PolicyAction.Read,
        connectionID
      )
    ) {
      // Redirect to the workspace connections page if the user is not allowed to access the connection
      router.push(`${workspaceUrl}/connections`);
    }
  }, [isResourceAllowed, connectionID, workspaceUrl, router]);

  const tabs = useMemo(
    () => [
      {
        name: dict.common.overview,
        link: `${baseUrl}`,
        active: pathname === `${baseUrl}`,
        icon: <GoWorkflow size={14} />,
      },
      {
        name: dict.repository.schema.schema,
        link: `${baseUrl}/schema`,
        active: pathname === `${baseUrl}/schema`,
        icon: <TbSchema size={14} />,
      },
      {
        name: dict.connectors.connector,
        link: `${baseUrl}/connector`,
        active: pathname === `${baseUrl}/connector`,
        icon: <TbPlug size={14} />,
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        name: dict.workspace.policies,
        link: `${baseUrl}/policies`,
        active: pathname === `${baseUrl}/policies`,
        icon: <TbShield size={14} />,
        hidden: !isResourceAllowed(PolicyResource.Policy, PolicyAction.Read),
      },
      {
        name: dict.common.logs,
        link: `${workspaceUrl}/logs/connection/${connectionID}`,
        active: false,
        icon: <TbBook size={14} />,
        hidden: !isResourceAllowed(PolicyResource.AuditLog, PolicyAction.Read),
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
      },
    ],
    [pathname, dict, baseUrl, workspaceUrl, connectionID, isResourceAllowed]
  );

  if (connectionQuery.isLoading)
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  if (!connectionQuery.data?.data)
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <h1>{dict.common.error}</h1>
      </div>
    );

  const connection = connectionQuery.data?.data;

  return (
    <>
      <div className='relative container mx-auto max-w-7xl'>
        <div
          className={`
            mx-auto my-4 flex w-full flex-col px-2
            md:px-4
            lg:flex-row lg:items-center
          `}
        >
          <div className='flex flex-col gap-2 py-4'>
            <div
              className={`
                flex flex-row items-center divide-x divide-gray-300
                dark:divide-gray-700
              `}
            >
              <div className='flex flex-row items-center gap-2 pr-2'>
                <span
                  className={`
                    text-xs text-gray-400
                    md:text-sm
                  `}
                >
                  {dict.connections.connection}
                </span>
                <Badge>{connection.connector.name}</Badge>
              </div>
              <span
                className={`
                  px-2 text-xs text-gray-400
                  md:text-sm
                `}
              >
                {dict.list.owner}:{' '}
                {`${connection.owner.first_name} ${connection.owner.last_name}`}
                {connection.owner.company
                  ? ` (${connection.owner.company})`
                  : ''}{' '}
                - {connection.owner.email}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1
                className={`
                  text-lg font-normal text-foreground
                  md:text-2xl
                `}
              >
                {connection.name}
              </h1>
              {connection.tags && connection.tags.length > 0 && (
                <WorkspaceTagDisplay
                  tags={connection.tags}
                  maxVisible={3}
                  size='sm'
                />
              )}
            </div>
            <p
              className={`
                max-w-lg text-xs text-gray-400
                lg:text-sm
              `}
            >
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
