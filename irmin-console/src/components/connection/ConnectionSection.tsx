'use client';

import { useMemo } from 'react';

import ConnectionConfigTable from '@/components/connection/ConnectionConfigTable';
import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import SafeComponent from '@/components/ui/error/SafeComponent';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

/**
 * Connection Settings section component
 */
const ConnectionSection = () => {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { connectionID, connectionQuery } = useConnectionContext();
  const { workflowsQuery } = useWorkflows();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const canViewConnection = useMemo(
    () => isResourceAllowed('connection', 'read', connectionID),
    [isResourceAllowed, connectionID]
  );

  const canViewWorkflows = useMemo(
    () => isResourceAllowed('workflow', 'read'),
    [isResourceAllowed]
  );

  const canCreateWorkflow = useMemo(
    () => isResourceAllowed('workflow', 'create'),
    [isResourceAllowed]
  );

  const relatedWorkflows = useMemo(
    () =>
      workflowsQuery.data?.data?.filter((item) => {
        if (item.type === 'import' || item.type === 'export') {
          return item.workflowable.connection_id === connectionID;
        }
        if (item.type === 'pipeline') {
          return item.workflowable.stages.some((stage) => {
            return (
              stage.type === 'connection' &&
              stage.connection_id === connectionID
            );
          });
        }
      }),
    [workflowsQuery.data?.data, connectionID]
  );

  if (!canViewConnection) {
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <CommonErrorDisplay
          variant='section'
          title={dict.common.error}
          description={dict.common.insufficientPermissions}
          showReload={false}
          showDetails={false}
        />
      </div>
    );
  }

  if (connectionQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!connectionQuery.data?.data) {
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <CommonErrorDisplay
          variant='section'
          title={dict.common.error}
          description={dict.common.weEncounteredError}
          showReload={false}
          showDetails={false}
        />
      </div>
    );
  }

  const connection = connectionQuery.data?.data;

  return (
    <SafeComponent
      level='section'
      title={dict.common.error}
      description={dict.common.weEncounteredError}
    >
      <div className='relative container mx-auto max-w-7xl'>
        <div className='flex flex-col gap-4 px-4 pb-4'>
          <div className='flex flex-col gap-4'>
            <ConnectorInfoSmall connector={connection.connector} />
            <ConnectionConfigTable
              title={dict.connections.config.details}
              data={connection.details}
            />
            {Object.keys(connection.settings).length > 0 && (
              <ConnectionConfigTable
                title={dict.connections.config.settings}
                data={connection.settings}
              />
            )}
          </div>
          {canViewWorkflows && (
            <WorkflowList
              workflows={relatedWorkflows ?? []}
              loading={workflowsQuery.isLoading}
              emptyStateAction={
                canCreateWorkflow
                  ? {
                      label: dict.workflow.create.createNewWorkflow,
                      href: `${workspaceUrl}/workflows?create`,
                      variant: 'gradient',
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </SafeComponent>
  );
};

export default ConnectionSection;
