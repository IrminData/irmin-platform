'use client';

import { useMemo, useState } from 'react';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import {
  TbDatabase,
  TbExclamationCircle,
  TbLogs,
  TbStepInto,
  TbTable,
} from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import TableViewer from '@/components/repository/objects/ObjectViewer/TableViewer';
import SchemaViewer from '@/components/repository/objects/SchemaViewer';
import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import ActionInputEditor from '@/components/workflow/ActionInputEditor';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceSchema } from '@/hooks/api';

import { nsDurationToMs } from '@/utils/nsDurationToMs';

import type { QueryResult } from '@/types/core/StoredQuery';
import type { ActionInputData } from '@/types/core/Workflow';

/**
 * Query Results component
 *
 * Used to display the results of a query execution.
 *
 * @param props - The props to pass to the component
 * @param props.title - Title of the query results
 * @param props.result - The result data to display
 * @param props.loading - Whether to show a loading skeleton
 * @param props.onRun - Optional callback to run the query
 * @param props.inputFiles - The input files to display
 * @param props.setInputFiles - Function to set the input files
 */
const QueryResults = ({
  title,
  result,
  loading,
  onRun,
  inputFiles = [],
  setInputFiles,
}: {
  title: string;
  result: QueryResult | null;
  loading?: boolean;
  onRun?: () => Promise<void>;
  inputFiles?: ActionInputData[];
  setInputFiles?: (_files: ActionInputData[]) => void;
}) => {
  const { dict } = useLocale();
  const workspaceSchema = useWorkspaceSchema();

  const [activeTab, setActiveTab] = useState('data');
  const [prevLoading, setPrevLoading] = useState(loading);

  // Adjust tab when loading transitions from true to false
  // This follows React's recommended pattern for deriving state from props:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (prevLoading === true && loading === false) {
    setPrevLoading(loading);
    const hasErrors = result?.has_errors;
    const hasNoData = !result?.data || result.data.length === 0;
    if (hasErrors || hasNoData) {
      setActiveTab('logs');
    }
  } else if (loading !== prevLoading) {
    setPrevLoading(loading);
  }

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
        {setInputFiles && (
          <div
            className={`
              border-accent
              ${activeTab === 'inputs' ? 'border-b-2' : ''}
            `}
          >
            <Button
              size='sm'
              variant={'ghost'}
              className={`rounded-b-none`}
              onClick={() => setActiveTab('inputs')}
              icon={<TbStepInto />}
            >
              {dict.workflow.scriptInputData}
            </Button>
          </div>
        )}
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
        {onRun && (
          <div className='ml-auto'>
            <Button
              icon={<AiOutlinePlayCircle />}
              variant='accent'
              size='sm'
              loading={loading}
              onClick={onRun}
            >
              {dict.query.run}
            </Button>
          </div>
        )}
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
      {activeTab === 'inputs' && setInputFiles && (
        <div className='flex-1 overflow-y-auto px-4 py-12'>
          <ActionInputEditor
            initialData={inputFiles}
            onChange={setInputFiles}
            disableSaveButton={true}
          />
        </div>
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
