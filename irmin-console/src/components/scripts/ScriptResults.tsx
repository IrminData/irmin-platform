'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AiOutlineSave } from 'react-icons/ai';
import { MdPlayArrow } from 'react-icons/md';
import {
  TbAlertTriangle,
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
import { useResourceAllowed } from '@/hooks/utils';

import {
  estimateDataSize,
  formatByteSize,
  MAX_SAFE_JSON_SIZE,
} from '@/utils/dataSizeUtils';
import { nsDurationToMs } from '@/utils/nsDurationToMs';

import type { ScriptResult } from '@/types/core/Script';
import type { ActionInputData } from '@/types/core/Workflow';
import type { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Script Results component
 *
 * Used to display the results of a script execution in the editor.
 *
 * @param props - The props to pass to the component
 * @param props.result - The result data to display
 * @param props.loading - Whether to show a loading skeleton
 * @param props.onSave - Function to save the data
 * @param props.onRun - Function to run the data
 * @param props.inputFiles - The input files to display
 * @param props.setInputFiles - Function to set the input files
 */
const EMPTY_INPUT_FILES: ActionInputData[] = [];

const ScriptResults = ({
  result,
  loading,
  onSave,
  onRun,
  inputFiles = EMPTY_INPUT_FILES,
  setInputFiles,
}: {
  result: ScriptResult | null;
  loading?: boolean;
  onSave?: () => Promise<void>;
  onRun?: () => Promise<void>;
  inputFiles?: ActionInputData[];
  setInputFiles?: (_files: ActionInputData[]) => void;
}) => {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const workspaceSchema = useWorkspaceSchema();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDataFile, setCurrentDataFile] = useState<string | null>(
    Object.keys(result?.structured_results ?? {})[0] ?? null
  );

  const [processingSave, setProcessingSave] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);

  const isLoading = loading || processingRun;
  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    // Detect when loading finishes (transitions from true to false)
    if (prevLoadingRef.current && !isLoading) {
      const hasErrors = result?.has_errors;
      const hasNoData =
        !result?.structured_results ||
        Object.keys(result.structured_results).length === 0;

      if (hasErrors || hasNoData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- redirecting to logs tab on loading-finished edge; needs effect timing
        setActiveTab('logs');
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, result]);

  const canSave = useMemo(
    () => isResourceAllowed('script', 'update'),
    [isResourceAllowed]
  );

  const canRun = useMemo(
    () => isResourceAllowed('script', 'create'),
    [isResourceAllowed]
  );

  // Reset current data file when result changes during render
  const [prevResultForDataFile, setPrevResultForDataFile] = useState(result);
  if (result !== prevResultForDataFile) {
    setPrevResultForDataFile(result);
    if (result?.structured_results) {
      const keys = Object.keys(result.structured_results);
      if (keys.length > 0) {
        setCurrentDataFile(keys[0]);
      }
    }
  }

  const currentDataFileContent = useMemo(() => {
    if (currentDataFile && result?.structured_results) {
      return result.structured_results[currentDataFile];
    }
    return null;
  }, [currentDataFile, result]);

  // Check total memory usage of all result files
  const totalDataSize = useMemo(() => {
    if (!result?.structured_results) return 0;
    return Object.values(result.structured_results).reduce(
      (sum, data) => sum + estimateDataSize(data),
      0
    );
  }, [result]);

  const showMemoryWarning = totalDataSize > MAX_SAFE_JSON_SIZE * 2;

  const showLoadingOnData = loading || processingRun;

  const showLoadingOnLogs = loading || processingRun;

  const logs = useMemo(() => result?.logs ?? [], [result]);

  // Memoize metadata to prevent unnecessary re-renders
  const tableMetadata = useMemo(
    () => ({
      rowsReturned: currentDataFileContent?.length ?? 0,
      timeTaken: nsDurationToMs(result?.duration ?? 0),
    }),
    [currentDataFileContent?.length, result?.duration]
  );

  return (
    <div
      className={`
        flex size-full flex-col overflow-hidden border-t border-gray-200
        bg-background
        dark:border-gray-800
      `}
      id='query-results'
    >
      {/* Memory warning banner */}
      {showMemoryWarning && (
        <div
          className={`
            flex items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4
            py-2 text-xs text-yellow-800
            dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200
          `}
        >
          <TbAlertTriangle className='size-4 shrink-0' />
          <span>
            Multiple large result files loaded ({formatByteSize(totalDataSize)}
            ). This may cause performance issues.
          </span>
        </div>
      )}

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
        <div className='ml-auto flex gap-2 text-right'>
          {result?.structured_results &&
            Object.keys(result.structured_results).length > 0 && (
              <select
                onChange={(e) => setCurrentDataFile(e.target.value)}
                className='py-1 pr-8 pl-2 text-xs'
              >
                {Object.keys(result.structured_results).map((file) => (
                  <option key={file} value={file}>
                    {file.split('/').pop()}
                  </option>
                ))}
              </select>
            )}
          {onSave && (
            <Button
              icon={<AiOutlineSave />}
              variant='secondary'
              size='sm'
              className='text-xs'
              loading={processingSave}
              disabled={!canSave}
              onClick={async () => {
                setProcessingSave(true);
                try {
                  await onSave();
                } catch (error) {
                  console.error(error);
                } finally {
                  setProcessingSave(false);
                }
              }}
            >
              {dict.common.save}
            </Button>
          )}
          {onRun && (
            <Button
              icon={<MdPlayArrow />}
              variant='accent'
              size='sm'
              className='px-4 text-xs'
              loading={processingRun || loading}
              disabled={!canRun}
              onClick={async () => {
                setProcessingRun(true);
                try {
                  await onRun();
                } catch (error) {
                  console.error(error);
                } finally {
                  setProcessingRun(false);
                }
              }}
            >
              {dict.query.run}
            </Button>
          )}
        </div>
      </div>
      {activeTab === 'data' && (
        <div className='flex-1 overflow-y-auto'>
          {currentDataFileContent ? (
            <TableViewer
              title={currentDataFile?.split('/').pop() ?? currentDataFile ?? ''}
              data={currentDataFileContent as Record<string, JSONValue>[]}
              metadata={tableMetadata}
              loading={showLoadingOnData}
            />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.common.noResults}
            </div>
          )}
        </div>
      )}
      {activeTab === 'logs' && (
        <div className='flex-1 overflow-y-auto'>
          {showLoadingOnLogs ? (
            <div
              className={`
                m-4 h-64 animate-pulse rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
          ) : logs && logs.length > 0 ? (
            <LogFeed logs={logs} />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.logs.noLogsFound}
            </div>
          )}
        </div>
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

export default ScriptResults;
