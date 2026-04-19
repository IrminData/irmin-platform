'use client';

import { useEffect, useMemo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import {
  TbActivity,
  TbBook,
  TbFileText,
  TbPlug,
  TbSchema,
  TbSettings,
  TbShield,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ConnectionLayoutSkeleton from '@/components/ui/loading/ConnectionLayoutSkeleton';
import AssetSharePopover from '@/components/ui/policy-editor/AssetSharePopover';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

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
  const { connectionID, connectionQuery, testConnectionMutation } =
    useConnectionContext();
  const { isResourceAllowed, loading: isResourceAllowedLoading } =
    useResourceAllowed();

  const connection = connectionQuery.data?.data;

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
    if (isResourceAllowedLoading) return;
    if (!isResourceAllowed('connection', 'read', connectionID)) {
      // Redirect to the workspace connections page if the user is not allowed to access the connection
      router.push(`${workspaceUrl}/connections`);
    }
  }, [
    isResourceAllowed,
    isResourceAllowedLoading,
    connectionID,
    workspaceUrl,
    router,
  ]);

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
    ],
    [pathname, dict, baseUrl]
  );

  const moreTabs = useMemo(
    () => [
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
        hidden: !isResourceAllowed('policy', 'read'),
      },
      {
        name: dict.common.logs,
        link: `${workspaceUrl}/logs/connection/${connectionID}`,
        active: false,
        icon: <TbBook size={14} />,
        hidden: !isResourceAllowed('audit_log', 'read'),
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

  if (connectionQuery.isLoading || isResourceAllowedLoading) {
    return <ConnectionLayoutSkeleton />;
  }

  if (connectionQuery.isError) {
    return (
      <LocalizedErrorDisplay
        error={connectionQuery.error}
        variant='page'
        showReload={true}
        onRetry={() => connectionQuery.refetch()}
        title={dict.common.errors.failedToLoadConnection}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }

  if (!connection) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        showHome={true}
        title={dict.common.errors.connectionNotFound}
        description={dict.common.errors.connectionNotFoundDescription}
      />
    );
  }

  return (
    <>
      <div className='relative container mx-auto max-w-7xl'>
        <div
          className={`
            mx-auto my-4 flex w-full flex-col px-2
            md:px-4
            lg:flex-row lg:items-center lg:justify-between
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
                {dict.common.owner}:{' '}
                {`${connection.owner.first_name} ${connection.owner.last_name}`}
                {connection.owner.company
                  ? ` (${connection.owner.company})`
                  : ''}{' '}
                - {connection.owner.email}
              </span>
            </div>
            <DisplayTitle>{connection.name}</DisplayTitle>
            <p
              className={`
                max-w-lg text-xs text-gray-400
                lg:text-sm
              `}
            >
              {connection.description}
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              {connection.tags && connection.tags.length > 0 && (
                <WorkspaceTagDisplay
                  tags={connection.tags}
                  maxVisible={3}
                  size='sm'
                />
              )}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => testConnectionMutation.mutate()}
              loading={testConnectionMutation.isPending}
              icon={<TbActivity size={16} />}
            >
              {dict.connections.testConnection}
            </Button>
            <AssetSharePopover
              resourceType='connection'
              resourceId={connection.id}
              resourceLabel={connection.name}
            />
          </div>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/connections`}
          backTooltip={dict.connections.connections}
          tabs={tabs}
          moreTabs={moreTabs}
          moreLabel={dict.common.more}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
