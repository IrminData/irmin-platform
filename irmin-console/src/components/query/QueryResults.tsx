'use client';

import { useState } from 'react';

import { AiOutlineSave } from 'react-icons/ai';
import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { MdPlayArrow } from 'react-icons/md';
import {
  TbExclamationCircle,
  TbFileText,
  TbLogs,
  TbTable,
} from 'react-icons/tb';

import { QueryExecutionResultAPIResponse } from '@/lib/core/resources/QueryService';

import LogFeed from '@/components/logs/LogFeed';
import Button from '@/components/ui/button';
import MDXEditor from '@/components/ui/markdown-editor/MDXEditor';

import { useLocale } from '@/context/LocaleContext';

import { ActionWorkflow } from '@/types/core/Workflow';

import ErrorList from './ErrorList';
import FolderAndFileData from './FolderAndFileData';
import TableData from './TableData';

/**
 * Query Results component
 *
 * Used by different pages to display results of actions, queries, etc.
 * Will determine the which component to use based on the data type.
 *
 * @param props - The props to pass to the component
 * @param props.title - Title of the query results
 * @param props.result - The result data to display
 * @param props.loading - Whether to show a loading skeleton
 * @param props.onSave - Function to save the data
 * @param props.onRun - Function to run the data
 * @param props.workflow - Workflow object
 */
const QueryResults = ({
  title,
  result,
  loading,
  onSave,
  onRun,
  workflow,
}: {
  title: string;
  result: QueryExecutionResultAPIResponse | null;
  loading?: boolean;
  onSave?: () => Promise<void>;
  onRun?: () => Promise<void>;
  workflow?: ActionWorkflow;
}) => {
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDocumentation, setCurrentDocumentation] = useState(
    workflow?.documentation ?? ''
  );
  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  const [processingSave, setProcessingSave] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);

  const showLoadingOnData = loading || processingRun;
  const errors = result?.errors ?? [];
  const logs = result?.data.logs ?? [];

  return (
    <div
      className='flex flex-1 flex-col overflow-hidden border-t border-gray-200 bg-background dark:border-gray-800'
      id='query-results'
    >
      {/* Tab Buttons */}
      <div className='mb-0 mt-1 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b dark:border-gray-800'>
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
            icon={<TbLogs />}
          >
            {dict.query.logs}
          </Button>
        </div>
        <div
          className={`border-accent ${activeTab === 'errors' ? 'border-b-2' : ''}`}
        >
          <Button
            size='sm'
            variant={'ghost'}
            className={`rounded-b-none`}
            onClick={() => setActiveTab('errors')}
            icon={<TbExclamationCircle />}
          >
            {dict.query.errors}{' '}
            {result?.errors ? `(${Object.keys(result.errors).length})` : ''}
          </Button>
        </div>
        {workflow && (
          <div
            className={`border-accent ${activeTab === 'documentation' ? 'border-b-2' : ''}`}
          >
            <Button
              size='sm'
              variant={'ghost'}
              className={`rounded-b-none`}
              onClick={() => setActiveTab('documentation')}
              icon={<TbFileText />}
            >
              {dict.documentation.documentation}
            </Button>
          </div>
        )}
        <div className='mb-2 ml-auto flex gap-2 text-right'>
          {activeTab === 'documentation' && (
            <Button
              onClick={() =>
                setDocumentationTab(
                  documentationTab === 'mdx' ? 'plain' : 'mdx'
                )
              }
              variant='link'
              size='sm'
              className='text-xs dark:text-gray-200'
              icon={
                documentationTab === 'mdx' ? (
                  <BsFileEarmarkRichtext />
                ) : (
                  <CiTextAlignLeft />
                )
              }
            >
              {documentationTab === 'mdx'
                ? dict.documentation.switchToPlainText
                : dict.documentation.switchToMarkdownEditor}
            </Button>
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
              {dict.query.save}
            </Button>
          )}
          {onRun && (
            <Button
              icon={<MdPlayArrow />}
              variant='default'
              size='sm'
              className='text-xs'
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
      {activeTab === 'data' && result?.data?.result.type === 'table' && (
        <TableData
          title={title}
          data={result.data.result}
          metadata={{
            rowsReturned: result.metadata?.total,
            timeTaken: result.data.execution_time,
          }}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && result?.data?.result.type === 'folder' && (
        <FolderAndFileData
          title={title}
          data={result.data.result}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && result?.data?.result.type === 'file' && (
        <FolderAndFileData
          title={title}
          data={result.data.result}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && !result?.data && (
        <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
          {dict.query.noResults}
        </div>
      )}
      {activeTab === 'errors' && <ErrorList errors={errors} dict={dict} />}
      {activeTab === 'logs' && (
        <>
          {logs && logs.length > 0 ? (
            <LogFeed text={logs.join('\n\n')} />
          ) : (
            <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
              {dict.logs.noLogsFound}
            </div>
          )}
        </>
      )}
      {activeTab === 'documentation' && (
        <div className='flex h-0 flex-1 flex-col overflow-scroll px-2 pt-2'>
          {documentationTab === 'plain' && (
            <textarea
              className='h-full w-full bg-gray-200 p-2 text-foreground focus:outline-none dark:text-gray-200'
              placeholder={dict.documentation.startTypingDocumentation}
              value={currentDocumentation}
              onChange={(e) => {
                setCurrentDocumentation(e.target.value);
              }}
              rows={40}
            />
          )}
          {documentationTab === 'mdx' && (
            <MDXEditor
              placeholder={dict.documentation.startTypingDocumentation}
              markdown={currentDocumentation}
              onChange={(markdown) => {
                setCurrentDocumentation(markdown);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default QueryResults;
