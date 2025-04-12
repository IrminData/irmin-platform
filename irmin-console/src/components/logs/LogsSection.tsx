'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Connection } from '@/types/core/Connection';
import { LogEvent } from '@/types/core/Log';
import { Repository } from '@/types/core/Repository';
import { Workflow } from '@/types/core/Workflow';

import LogEventFeed from './LogEventFeed';

/**
 * Logs section - showing log events for the workspace or workflow.
 *
 * @param props - The component properties
 * @param props.title - The title of the logs section
 * @param props.logEvents - List of log events to display
 * @param props.workflow - Optional. The workflow the logs belong to
 * @param props.repository - Optional. The repository the logs belong to
 * @param props.connection - Optional. The connection the logs belong to
 */
export default function LogsSection({
  title,
  logEvents,
  workflow,
  repository,
  connection,
}: {
  title: string;
  logEvents: LogEvent[];
  workflow?: Workflow;
  repository?: Repository;
  connection?: Connection;
}) {
  const router = useRouter();
  const { dict } = useLocale();

  const [filteredItems, setFilteredItems] = useState(logEvents);
  const [searchQuery, setSearchQuery] = useState('');

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (logEvents) {
        setFilteredItems(
          logEvents.filter((item) =>
            item.description
              .trim()
              .replace(/\s+/g, '')
              .toLowerCase()
              .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
          )
        );
      }
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, logEvents]);

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='flex flex-col px-2 py-12 md:px-4'>
        <div className='mb-12 flex items-center gap-8'>
          {(workflow || repository || connection) && (
            <Button
              size='icon'
              variant='gray'
              className='rounded-full'
              icon={<IoChevronBack size={24} />}
              onClick={() => router.back()}
            />
          )}
          <div>
            <h2 className='font-display text-foreground/80 text-3xl font-bold sm:text-4xl lg:text-5xl'>
              {title}
            </h2>
            {workflow && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/workflows/${workflow.id}`}
                >
                  {workflow.name}
                </Link>
              </h3>
            )}
            {repository && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/repositories/${repository.slug}`}
                >
                  {repository.name}
                </Link>
              </h3>
            )}
            {connection && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/connections/${connection.id}`}
                >
                  {connection.name}
                </Link>
              </h3>
            )}
          </div>
        </div>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-hidden dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        {filteredItems && filteredItems.length > 0 ? (
          <LogEventFeed
            events={filteredItems}
            systemLabel={dict.logs.system}
            subject={workflow ?? repository ?? connection}
          />
        ) : (
          <p className='text-center text-lg text-gray-600 dark:text-gray-400'>
            {dict.logs.noLogsFound}
          </p>
        )}
      </div>
    </div>
  );
}
