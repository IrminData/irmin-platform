'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useConnection } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { ExportWorkflow, ImportWorkflow } from '@/types/core/Workflow';

/**
 * Connection Settings section component
 */
const ConnectionSection = ({
  importWorkflows,
  exportWorkflows,
}: {
  importWorkflows: ImportWorkflow[];
  exportWorkflows: ExportWorkflow[];
}) => {
  const { dict } = useLocale();
  const { connection } = useConnection();

  const relatedWorkflows = useMemo(() => {
    return [
      ...importWorkflows.filter(
        (item) => item.workflowable.connection.id === connection.id
      ),
      ...exportWorkflows.filter(
        (item) => item.workflowable.connection.id === connection.id
      ),
    ];
  }, [importWorkflows, exportWorkflows, connection.id]);

  const { details, settings } = useMemo(() => {
    let parsedDetails = {};
    let parsedSettings = {};
    try {
      parsedDetails = JSON.parse(connection.details ?? '{}');
      parsedSettings = JSON.parse(connection.settings ?? '{}');
    } catch (error) {
      console.error('Error parsing connection details or settings:', error);
    }
    return { details: parsedDetails, settings: parsedSettings };
  }, [connection.details, connection.settings]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-background p-4 text-sm text-foreground lg:text-lg'>
          <div className='flex w-full flex-row items-center gap-4'>
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-card px-4 py-2 text-left text-sm text-card-foreground shadow'>
              <Image
                src={connection.connector.logo_url}
                alt={connection.connector.name}
                className='h-12 w-12 object-contain'
                width={48}
                height={48}
              />
              <div className='flex flex-col justify-start gap-1'>
                {connection.connector.primary_category && (
                  <Badge variant='secondary'>
                    {connection.connector.primary_category}
                  </Badge>
                )}
                <p>{connection.connector.name}</p>
              </div>
            </div>
            <div className='flex max-w-64 flex-col gap-1'>
              <p className='text-sm opacity-80'>
                {connection.connector.description}
              </p>
              {connection.connector.read_more_url && (
                <Button
                  variant='link'
                  target='_blank'
                  className='h-max p-0'
                  rel='noopener noreferrer'
                  href={connection.connector.read_more_url}
                >
                  {dict.connections.create.learnMore}
                </Button>
              )}
            </div>
          </div>
          <hr className='w-full border-b dark:border-gray-800' />
          {Object.entries(details).map(([key, value]) => (
            <div className='flex flex-col gap-1' key={`details-${key}`}>
              <p className='text-sm opacity-60'>{key}</p>
              <p className='text-base'>{`${value}`}</p>
            </div>
          ))}
          {Object.entries(settings).map(([key, value]) => (
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
