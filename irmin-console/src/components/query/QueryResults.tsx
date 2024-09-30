'use client';

import { useState } from 'react';

import { QueryAPIResponse } from '@/services/core/resources/QueryService';

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

import Button from '@/components/common/button/Button';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';
import LogFeed from '@/components/logs/LogFeed';

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
  result: QueryAPIResponse | null;
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
  const errors = result?.errors ?? {};
  const logs = result?.metadata.logs ?? '';

  return (
    <div
      className='flex flex-1 flex-col overflow-hidden border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-irmin_black'
      id='query-results'
    >
      {/* Tab Buttons */}
      <div className='mb-0 mt-1 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b dark:border-gray-800'>
        <div
          className={`border-irmin_green ${activeTab === 'data' ? 'border-b-2' : ''}`}
        >
          <Button
            size='sm'
            variant='link'
            colorScheme={activeTab === 'data' ? 'primary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline dark:text-gray-200`}
            onClick={() => setActiveTab('data')}
            icon={<TbTable />}
          >
            {dict.query.results}
          </Button>
        </div>
        <div
          className={`border-irmin_green ${activeTab === 'logs' ? 'border-b-2' : ''}`}
        >
          <Button
            size='sm'
            variant='link'
            colorScheme={activeTab === 'logs' ? 'primary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline dark:text-gray-200`}
            onClick={() => setActiveTab('logs')}
            icon={<TbLogs />}
          >
            {dict.query.logs}
          </Button>
        </div>
        <div
          className={`border-irmin_green ${activeTab === 'errors' ? 'border-b-2' : ''}`}
        >
          <Button
            size='sm'
            variant='link'
            colorScheme={activeTab === 'errors' ? 'primary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline dark:text-gray-200`}
            onClick={() => setActiveTab('errors')}
            icon={<TbExclamationCircle />}
          >
            {dict.query.errors}{' '}
            {result?.errors ? `(${Object.keys(result.errors).length})` : ''}
          </Button>
        </div>
        {workflow && (
          <div
            className={`border-irmin_green ${activeTab === 'documentation' ? 'border-b-2' : ''}`}
          >
            <Button
              size='sm'
              variant='link'
              colorScheme={activeTab === 'documentation' ? 'primary' : 'gray'}
              className={`justify-start rounded-none text-xs shadow-none hover:no-underline dark:text-gray-200`}
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
              colorScheme={'gray'}
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
              colorScheme='light'
              variant='solid'
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
              colorScheme='primary'
              variant='solid'
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
      {activeTab === 'data' && result?.data?.type === 'table' && (
        <TableData
          title={title}
          data={result.data}
          metadata={{
            rowsReturned: parseInt(result.metadata.itemsReturned),
            timeTaken: parseInt(result.metadata.timeTaken),
          }}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && result?.data?.type === 'folder' && (
        <FolderAndFileData
          title={title}
          data={result.data}
          loading={showLoadingOnData}
        />
      )}
      {activeTab === 'data' && result?.data?.type === 'file' && (
        <FolderAndFileData
          title={title}
          data={result.data}
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
            <LogFeed text={logs} />
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
              className='h-full w-full bg-gray-200 p-2 text-irmin_black focus:outline-none dark:bg-irmin_black dark:text-gray-200'
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
