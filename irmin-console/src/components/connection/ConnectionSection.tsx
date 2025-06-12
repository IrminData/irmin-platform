'use client';

import { useMemo } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useWorkflows } from '@/hooks/useWorkflows';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * Connection Settings section component
 */
const ConnectionSection = () => {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { connectionID, connectionQuery } = useConnectionContext();
  const { workflowsQuery } = useWorkflows();

  const canViewConnection = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.Connection,
        PolicyAction.Read,
        connectionID
      ),
    [isResourceAllowed, connectionID]
  );

  const canViewWorkflows = useMemo(
    () => isResourceAllowed(PolicyResource.Workflow, PolicyAction.Read),
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
        <div className='my-4 flex flex-col gap-4 p-4'>
          <p className='text-sm opacity-60'>{dict.common.error}</p>
          <p className='text-sm opacity-60'>
            {dict.common.insufficientPermissions}
          </p>
        </div>
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
    return <h1>{dict.common.error}</h1>;
  }

  const connection = connectionQuery.data?.data;

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        <div className='bg-background text-foreground flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg p-4 text-sm lg:text-lg'>
          <ConnectorInfoSmall connector={connection.connector} />
          <hr className='w-full border-b dark:border-gray-800' />
          {Object.entries(connection.details).map(([key, value]) => (
            <div className='flex flex-col gap-1' key={`details-${key}`}>
              <p className='text-sm opacity-60'>{key}</p>
              <p className='text-base'>{`${value}`}</p>
            </div>
          ))}
          {Object.entries(connection.settings).map(([key, value]) => (
            <div className='flex flex-col gap-1' key={`settings-${key}`}>
              <p className='text-sm opacity-60'>{key}</p>
              <p className='text-base'>{`${value}`}</p>
            </div>
          ))}
        </div>
        {canViewWorkflows && (
          <WorkflowList
            workflows={relatedWorkflows ?? []}
            loading={workflowsQuery.isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ConnectionSection;
