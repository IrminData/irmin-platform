'use client';

import { useMemo, useState } from 'react';

import {
  TbDatabase,
  TbExclamationCircle,
  TbLogs,
  TbTable,
} from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import TableViewer from '@/components/repository/objects/ObjectViewer/TableViewer';
import SchemaViewer from '@/components/repository/objects/SchemaViewer';
import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceSchema } from '@/hooks/api';

import { nsDurationToMs } from '@/utils/nsDurationToMs';

import type { QueryResult } from '@/types/core/StoredQuery';

/**
 * Query Results component
 *
 * Used to display the results of a query execution.
 *
 * @param props - The props to pass to the component
 * @param props.title - Title of the query results
 * @param props.result - The result data to display
 * @param props.loading - Whether to show a loading skeleton
 */
const QueryResults = ({
  title,
  result,
  loading,
}: {
  title: string;
  result: QueryResult | null;
  loading?: boolean;
}) => {
  const { dict } = useLocale();
  const workspaceSchema = useWorkspaceSchema();

  const [activeTab, setActiveTab] = useState('data');

  const showLoadingOnData = useMemo(() => loading, [loading]);
  const logs = useMemo(() => result?.logs ?? [], [result?.logs]);

  return (
    <div
      className={`
        flex flex-1 flex-col overflow-hidden border-t border-gray-200
        bg-background
        dark:border-gray-800
      `}
      id='query-results'
    >
      {/* Tab Buttons */}
      <div
        className={`
          mt-1 mb-0 flex w-full flex-wrap justify-start gap-2 border-gray-200
          px-2
          md:border-b
          dark:border-gray-800
        `}
      >
        <div
          className={`
            border-accent
            ${activeTab === 'data' ? 'border-b-2' : ''}
          `}
        >
          <Button
            size='sm'
            variant={'ghost'}
            className={`rounded-b-none`}
            onClick={() => setActiveTab('data')}
            icon={<TbTable />}
          >
            {dict.query.results}
          </Button>
        </div>
        <div
          className={`
            border-accent
            ${activeTab === 'logs' ? 'border-b-2' : ''}
          `}
        >
          <Button
            size='sm'
            variant={'ghost'}
            className={`rounded-b-none`}
            onClick={() => setActiveTab('logs')}
            icon={result?.has_errors ? <TbExclamationCircle /> : <TbLogs />}
          >
            {dict.common.logs}{' '}
            {result?.has_errors ? `(${dict.query.errors})` : ''}
          </Button>
        </div>
        <div
          className={`
            border-accent
            ${activeTab === 'schema' ? 'border-b-2' : ''}
          `}
        >
          <Button
            size='sm'
            variant={'ghost'}
            className={`rounded-b-none`}
            onClick={() => setActiveTab('schema')}
            icon={<TbDatabase />}
          >
            {dict.repository.schema.schema}
          </Button>
        </div>
      </div>
      {activeTab === 'data' && result?.data && (
        <TableViewer
          title={title}
          data={result.data}
          metadata={{
            rowsReturned: result.data.length,
            timeTaken: nsDurationToMs(result.duration ?? 0),
          }}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && !result?.data && (
        <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
          {dict.common.noResults}
        </div>
      )}
      {activeTab === 'logs' && (
        <>
          {logs && logs.length > 0 ? (
            <LogFeed logs={logs} />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.logs.noLogsFound}
            </div>
          )}
        </>
      )}
      {activeTab === 'schema' && (
        <div className='flex-1 overflow-y-auto p-4'>
          {workspaceSchema.loading ? (
            <LoadingSkeleton className='size-full' />
          ) : workspaceSchema.schema ? (
            <SchemaViewer schema={workspaceSchema.schema} isExpanded={true} />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.common.noResults}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryResults;
