'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TbChevronLeft, TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import PaginationControls from '@/components/ui/PaginationControls';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useLogEvents } from '@/hooks/useLogEvents';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { User } from '@/types/core/User';
import { Workflow } from '@/types/core/Workflow';

import LogEventFeed from './LogEventFeed';

/**
 * Logs section - showing log events for the workspace or workflow.
 *
 * @param props - The component properties
 * @param props.title - The title of the logs section
 * @param props.logsForType - The type of logs to show (workspace, workflow, repository, connection, user)
 * @param props.logsFor - The ID of the specific entity to fetch logs for (e.g., workflow ID, repository slug, etc.)
 * @param props.workflow - Optional. The workflow to show logs for
 * @param props.repository - Optional. The repository to show logs for
 * @param props.connection - Optional. The connection to show logs for
 * @param props.user - Optional. The user to show logs for
 */
export default function LogsSection({
  title,
  logsForType = 'workspace',
  logsFor,
  workflow,
  repository,
  connection,
  user,
}: {
  title: string;
  logsForType?: 'workspace' | 'workflow' | 'repository' | 'connection' | 'user';
  logsFor?: string;
  workflow?: Workflow;
  repository?: Repository;
  connection?: Connection;
  user?: User;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const { logEvents, goToPage, currentPage, totalPages, loading } =
    useLogEvents({
      perPage: 50,
      logsForType,
      logsFor,
    });

  const [filteredItems, setFilteredItems] = useState(logEvents);
  const [filteringItems, setFilteringItems] = useState(false);
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
        const newItems = logEvents.filter((item) =>
          item.description
            .trim()
            .replace(/\s+/g, '')
            .toLowerCase()
            .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
        );
        setFilteredItems(newItems);
        if (newItems.length === logEvents.length) {
          setFilteringItems(false);
        } else {
          setFilteringItems(true);
        }
      }
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, logEvents]);

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='flex flex-col gap-8 px-2 py-12 md:px-4'>
        <div className='flex items-center gap-8'>
          {(workflow || repository || connection || user) && (
            <Button
              size='icon'
              variant='gray'
              className='rounded-full'
              icon={<TbChevronLeft size={24} />}
              onClick={() => router.back()}
            />
          )}
          <div>
            <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
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
            {user && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                {user.first_name} {user.last_name} - {user.email}
              </h3>
            )}
          </div>
        </div>
        <div className='flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-hidden dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2 focus:outline-hidden'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <LogEventFeed
          events={filteringItems ? filteredItems : logEvents}
          systemLabel={dict.logs.system}
          subject={workflow ?? repository ?? connection}
          loading={loading}
        />
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          previousLabel={dict.common.previous}
          nextLabel={dict.common.next}
        />
      </div>
    </div>
  );
}
