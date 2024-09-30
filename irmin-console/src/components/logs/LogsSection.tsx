'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useLogs } from '@/context/LogContext';
import { useWorkspace } from '@/context/workspace';

import LogEventFeed from './LogEventFeed';

/**
 * Logs section - showing log events for the workspace or workflow.
 *
 * @param props - The component properties
 * @param props.workflow - Optional. Slug of the workflow to fetch logs for
 */
export default function LogsSection({ workflow }: { workflow?: string }) {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const { logEvents, fetchLogEvents, loadingLogEvents } = useLogs();
  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
  } = useWorkspace();

  const [filteredItems, setFilteredItems] = useState(logEvents);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogEvents(workflow);
  }, [workflow, fetchLogEvents]);

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

  const selectedWorkflow = useMemo(
    () => allWorkflows.find((w) => w.id === workflow),
    [allWorkflows, workflow]
  );

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='flex flex-col px-2 py-12 md:px-4'>
        <div className='mb-12 flex items-center gap-8'>
          {workflow && (
            <Button
              size='sm'
              variant='icon'
              colorScheme='light'
              className='bg-gray-100 dark:bg-gray-700'
              icon={<IoChevronBack size={24} />}
              onClick={() => router.back()}
            >
              <IoChevronBack size={24} />
            </Button>
          )}
          <div>
            <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
              {workflow ? dict.logs.workflowLogs : dict.logs.workspaceLogs}
            </h2>
            {selectedWorkflow && (
              <h3 className='mt-4 text-lg text-gray-600 xl:text-xl dark:text-gray-400'>
                <Link
                  className='hover:underline'
                  href={`/${locale}/console/${currentWorkspace?.slug}/workflows/${workflow}`}
                >
                  {selectedWorkflow.name}
                </Link>
              </h3>
            )}
          </div>
        </div>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-none dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        {loadingLogEvents ? (
          <LoadingSkeleton className='h-96 w-full' />
        ) : filteredItems && filteredItems.length > 0 ? (
          <LogEventFeed events={filteredItems} systemLabel={dict.logs.system} />
        ) : (
          <p className='text-center text-lg text-gray-600 dark:text-gray-400'>
            {dict.logs.noLogsFound}
          </p>
        )}
      </div>
    </div>
  );
}
