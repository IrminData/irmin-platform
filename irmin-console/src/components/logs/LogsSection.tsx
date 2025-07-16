'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TbChevronLeft, TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import PaginationControls from '@/components/ui/PaginationControls';

import { useLocale } from '@/context/LocaleContext';

import { type LogsForType, useLogEvents } from '@/hooks/api/useLogEvents';
import { useBaseUrl } from '@/hooks/utils';

import type { Connection } from '@/types/core/Connection';
import type { Object } from '@/types/core/Object';
import type { Policy } from '@/types/core/Policy';
import type { Repository } from '@/types/core/Repository';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { User } from '@/types/core/User';
import type { Workflow } from '@/types/core/Workflow';

import LogEventFeed from './LogEventFeed';

/**
 * Logs section - showing log events for the workspace or workflow.
 *
 * @param props - The component properties
 * @param props.title - The title of the logs section
 * @param props.logsForType - The type of logs to show
 * @param props.logsFor - The ID of the specific entity to fetch logs for (e.g., workflow ID, repository slug, etc.)
 * @param props.workflow - Optional. The workflow to show logs for
 * @param props.repository - Optional. The repository to show logs for
 * @param props.connection - Optional. The connection to show logs for
 * @param props.user - Optional. The user to show logs for
 * @param props.storedQuery - Optional. The stored query to show logs for
 * @param props.policy - Optional. The policy to show logs for
 * @param props.repositoryObject - Optional. The repository object to show logs for
 */
export default function LogsSection({
  title,
  logsForType = 'workspace',
  logsFor,
  workflow,
  repository,
  connection,
  user,
  storedQuery,
  policy,
  repositoryObject,
}: {
  title: string;
  logsForType?: LogsForType;
  logsFor?: string;
  workflow?: Workflow;
  repository?: Repository;
  connection?: Connection;
  storedQuery?: StoredQuery;
  policy?: Policy;
  repositoryObject?: Object;
  user?: User;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const {
    logEvents,
    goToPage,
    totalItems,
    currentPage,
    totalPages,
    loading,
    error,
    setSearchQuery,
    refetch,
  } = useLogEvents({
    perPage: 50,
    logsForType,
    logsFor,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div
        className={`
          flex flex-col gap-8 px-2 py-12
          md:px-4
        `}
      >
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
            <h2
              className={`
                font-display text-3xl font-bold text-foreground/90
                sm:text-4xl
                lg:text-5xl
              `}
            >
              {title}
            </h2>
            {workflow && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/workflows/${workflow.id}`}
                >
                  {workflow.name}
                </Link>
              </h3>
            )}
            {repository && !repositoryObject && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/repositories/${repository.slug}`}
                >
                  {repository.name}
                </Link>
              </h3>
            )}
            {repositoryObject && repository && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/repositories/${repository.slug}/object?path=${repositoryObject.path}`}
                >
                  {repositoryObject.path} - {repositoryObject.name}
                </Link>
              </h3>
            )}
            {connection && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                <Link
                  className='hover:underline'
                  href={`${workspaceUrl}/connections/${connection.id}`}
                >
                  {connection.name}
                </Link>
              </h3>
            )}
            {user && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                {user.first_name} {user.last_name} - {user.email}
              </h3>
            )}
            {storedQuery && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                {storedQuery.name}
              </h3>
            )}
            {policy && (
              <h3
                className={`
                  mt-4 text-lg text-gray-600
                  xl:text-xl
                  dark:text-gray-400
                `}
              >
                {policy.id}
              </h3>
            )}
          </div>
        </div>
        <div
          className={`
            flex w-full items-center gap-2 rounded-md bg-gray-100 p-2
            text-gray-900
            focus:outline-hidden
            dark:bg-gray-800 dark:text-gray-200
          `}
        >
          <TbSearch />
          <input
            type='text'
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full bg-transparent p-2
              focus:outline-hidden
            `}
            placeholder={dict.list.searchPlaceholder}
            disabled={loading}
          />
        </div>
        <p
          className={`
            text-xs text-foreground/80
            lg:text-sm
          `}
        >
          {dict.logs.foundLogEvents}: {totalItems}
        </p>
        {error ? (
          <QueryError
            error={error}
            onRetry={() => refetch()}
            title={dict.common.somethingWentWrong}
          />
        ) : (
          <LogEventFeed events={logEvents} loading={loading} />
        )}
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
