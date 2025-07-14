'use client';

import { useEffect, useMemo, useState } from 'react';

import { AiOutlineSave } from 'react-icons/ai';
import { MdPlayArrow } from 'react-icons/md';
import {
  TbExclamationCircle,
  TbLogs,
  TbStepInto,
  TbTable,
} from 'react-icons/tb';

import LogFeed from '@/components/logs/LogFeed';
import TableViewer from '@/components/repository/objects/ObjectViewer/TableViewer';
import { Button } from '@/components/ui/button';
import ActionInputEditor from '@/components/workflow/ActionInputEditor';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { nsDurationToMs } from '@/utils/nsDurationToMs';

import type { ScriptResult } from '@/types/core/EditorItems';
import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { ActionInputData } from '@/types/core/Workflow';

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
const ScriptResults = ({
  result,
  loading,
  onSave,
  onRun,
  inputFiles = [],
  setInputFiles,
}: {
  result: ScriptResult | null;
  loading?: boolean;
  onSave?: () => Promise<void>;
  onRun?: () => Promise<void>;
  inputFiles?: ActionInputData[];
  setInputFiles?: (files: ActionInputData[]) => void;
}) => {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDataFile, setCurrentDataFile] = useState<string | null>(
    Object.keys(result?.structured_results ?? {})[0] ?? null
  );

  const [processingSave, setProcessingSave] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);

  const canSave = useMemo(
    () => isResourceAllowed(PolicyResource.EditorScript, PolicyAction.Update),
    [isResourceAllowed]
  );

  const canRun = useMemo(
    () => isResourceAllowed(PolicyResource.EditorScript, PolicyAction.Create),
    [isResourceAllowed]
  );

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
      {activeTab === 'inputs' && setInputFiles && (
        <div className='w-full overflow-y-auto px-4 py-12'>
          <ActionInputEditor
            initialData={inputFiles}
            onChange={setInputFiles}
            disableSaveButton={true}
          />
        </div>
      )}
    </div>
  );
};

export default ScriptResults;
