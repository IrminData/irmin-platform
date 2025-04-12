'use client';

import { useMemo } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useConnection } from '@/context/ConnectionContext';

import { Workflow } from '@/types/core/Workflow';

/**
 * Connection Settings section component
 */
const ConnectionSection = ({ workflows }: { workflows: Workflow[] }) => {
  const { connection } = useConnection();

  const relatedWorkflows = useMemo(
    () =>
      workflows.filter((item) => {
        if (item.type === 'import' || item.type === 'export') {
          return item.workflowable.connection.id === connection.id;
        }
        if (item.type === 'pipeline') {
          return item.workflowable.stages.some((stage) => {
            return (
              stage.type === 'connection' &&
              stage.connection.id === connection.id
            );
          });
        }
      }),
    [workflows, connection.id]
  );

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
        <WorkflowList workflows={relatedWorkflows} loading={false} />
      </div>
    </div>
  );
};

export default ConnectionSection;
