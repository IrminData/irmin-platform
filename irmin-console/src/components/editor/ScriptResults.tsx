'use client';

import { useEffect, useMemo, useState } from 'react';

import { AiOutlineSave } from 'react-icons/ai';
import { MdPlayArrow } from 'react-icons/md';
import { TbExclamationCircle, TbLogs, TbTable } from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import TableViewer from '@/components/repository/objects/ObjectViewer/TableViewer';
import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { nsDurationToMs } from '@/utils/nsDurationToMs';

import { ScriptResult } from '@/types/core/EditorItems';

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
 */
const ScriptResults = ({
  result,
  loading,
  onSave,
  onRun,
}: {
  result: ScriptResult | null;
  loading?: boolean;
  onSave?: () => Promise<void>;
  onRun?: () => Promise<void>;
}) => {
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDataFile, setCurrentDataFile] = useState<string | null>(
    Object.keys(result?.structured_results ?? {})[0] ?? null
  );

  const [processingSave, setProcessingSave] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);

  useEffect(() => {
    if (result?.structured_results) {
      const keys = Object.keys(result.structured_results);
      if (keys.length > 0) {
        setCurrentDataFile(keys[0]);
      }
    }
  }, [result]);

  const currentDataFileContent = useMemo(() => {
    if (currentDataFile && result?.structured_results) {
      return result.structured_results[currentDataFile];
    }
    return null;
  }, [currentDataFile, result]);

  const showLoadingOnData = useMemo(
    () => loading || processingRun,
    [loading, processingRun]
  );

  const logs = useMemo(() => result?.logs ?? [], [result]);

  return (
    <div
      className='bg-background flex flex-1 flex-col overflow-hidden border-t border-gray-200 dark:border-gray-800'
      id='query-results'
    >
      {/* Tab Buttons */}
      <div className='mt-1 mb-0 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b dark:border-gray-800'>
        <div
          className={`border-accent ${activeTab === 'data' ? 'border-b-2' : ''}`}
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
          className={`border-accent ${activeTab === 'logs' ? 'border-b-2' : ''}`}
        >
          <Button
            size='sm'
            variant={'ghost'}
            className={`rounded-b-none`}
            onClick={() => setActiveTab('logs')}
            icon={result?.has_errors ? <TbExclamationCircle /> : <TbLogs />}
          >
            {dict.query.logs}{' '}
            {result?.has_errors ? `(${dict.query.errors})` : ''}
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
              onClick={() => {
                setProcessingSave(true);
                onSave().finally(() => {
                  setProcessingSave(false);
                });
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
              onClick={() => {
                setProcessingRun(true);
                onRun().finally(() => {
                  setProcessingRun(false);
                });
              }}
            >
              {dict.query.run}
            </Button>
          )}
        </div>
      </div>
      {activeTab === 'data' && (
        <>
          {currentDataFileContent ? (
            <TableViewer
              title={currentDataFile?.split('/').pop() ?? currentDataFile ?? ''}
              data={currentDataFileContent}
              metadata={{
                rowsReturned: currentDataFileContent.length,
                timeTaken: nsDurationToMs(result?.duration ?? 0),
              }}
              loading={showLoadingOnData}
            />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.common.noResults}
            </div>
          )}
        </>
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
    </div>
  );
};

export default ScriptResults;
