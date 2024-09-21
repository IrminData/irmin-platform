'use client';

import Image from 'next/image';
import Link from 'next/link';

import WorkflowList from '@/components/workflow/WorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Connection } from '@/types/core/Connection';

/**
 * Connection Settings section component
 *
 * @param props0 - The props
 * @param props0.connection - The connection to view
 */
const ConnectionSection = ({ connection }: { connection: Connection }) => {
  const { dict } = useLocale();

  const {
    workflows: { imports, exports },
  } = useWorkspace();

  const loading = imports.isLoading || exports.isLoading;
  const relatedWorkflows = [
    ...imports.imports.filter(
      (item) => item.workflowable.connection.id === connection.id
    ),
    ...exports.exports.filter(
      (item) => item.workflowable.connection.id === connection.id
    ),
  ];

  let details = {};
  let settings = {};
  try {
    details = JSON.parse(connection.details ?? '{}');
    settings = JSON.parse(connection.settings ?? '{}');
  } catch (error) {
    console.error('Error parsing connection details or settings:', error);
  }

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='my-4 flex flex-col gap-4 p-4'>
        <div className='flex w-full flex-wrap items-center justify-start gap-x-8 gap-y-4 rounded-lg bg-gray-100 p-4 text-sm text-irmin_black lg:text-lg dark:bg-irmin_black-800 dark:text-gray-100'>
          <div className='flex w-full flex-row items-center gap-4'>
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-gray-50 px-4 py-2 text-left text-sm text-irmin_black shadow dark:bg-gray-800 dark:text-gray-200'>
              <Image
                src={connection.connector.logo}
                alt={connection.connector.name}
                className='h-12 w-12 object-contain'
                width={48}
                height={48}
              />
              <div className='flex flex-col justify-start gap-1'>
                <span className='w-max rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {connection.connector.category}
                </span>
                <p>{connection.connector.name}</p>
              </div>
            </div>
            <div className='flex max-w-64 flex-col gap-1'>
              <p className='text-sm opacity-80'>
                {connection.connector.description}
              </p>
              {connection.connector.url && (
                <Link
                  className='text-sm text-irmin_blue transition-all duration-200 hover:underline dark:text-irmin_green'
                  target='_blank'
                  rel='noopener noreferrer'
                  href={connection.connector.url}
                >
                  {dict.connections.create.learnMore}
                </Link>
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
        <WorkflowList workflows={relatedWorkflows} loading={loading} />
      </div>
    </div>
  );
};

export default ConnectionSection;
