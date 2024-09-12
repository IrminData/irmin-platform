'use client';

import { useEffect, useState } from 'react';

import { AiOutlineDownload, AiOutlineSave } from 'react-icons/ai';
import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { MdPlayArrow } from 'react-icons/md';
import { TbFileText, TbTable } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';
import AdvancedDatatable from '@/components/query/datatables/AdvancedDatatable';

import { useLocale } from '@/context/LocaleContext';

import { downloadCSV } from '@/utils/csv';

import { ActionWorkflow } from '@/types/api/Workflow';
import { CollectionRow } from '@/types/internal/Collection';

/**
 * Query Results component
 *
 * Used by different pages to display  results of files, actions, queries, etc.
 */
const QueryResults = ({
  title,
  data,
  metadata,
  loading,
  onSave,
  onRun,
  workflow,
}: {
  title: string;
  data: CollectionRow[] | null;
  metadata: {
    rowsReturned?: number;
    timeTaken?: number;
  };
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

  const [filterText, setFilterText] = useState('');
  const [filteredItems, setFilteredItems] = useState(data);

  const [processingSave, setProcessingSave] = useState(false);
  const [processingRun, setProcessingRun] = useState(false);

  // Update the filtered items when the filter text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterText && filterText.length > 0) {
        const newData =
          data?.filter((item) => {
            return Object.keys(item).some((key) => {
              const value =
                key in item ? item[key as keyof typeof item] : undefined;
              return (
                value &&
                value
                  .toString()
                  .toLowerCase()
                  .includes(filterText.toLowerCase())
              );
            });
          }) ?? [];
        setFilteredItems(newData);
      } else {
        setFilteredItems(data);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText, data]);

  return (
    <div
      className='flex flex-1 flex-col overflow-hidden bg-white dark:bg-irmin_black'
      id='query-results'
    >
      {/* Tab Buttons */}
      <div className='mb-0 mt-1 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b dark:border-gray-800'>
        <div
          className={`border-irmin_green ${activeTab === 'data' ? 'border-b-2' : ''}`}
        >
          <Button
            ariaLabel={`Switch to data viewer tab`}
            size='sm'
            variant='link'
            colorScheme={activeTab === 'data' ? 'secondary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline dark:text-gray-200`}
            onClick={() => setActiveTab('data')}
            icon={<TbTable />}
          >
            {dict.query.results}
          </Button>
        </div>
        {workflow && (
          <div
            className={`border-irmin_green ${activeTab === 'documentation' ? 'border-b-2' : ''}`}
          >
            <Button
              ariaLabel={`Switch to documentation tab`}
              size='sm'
              variant='link'
              colorScheme={activeTab === 'documentation' ? 'secondary' : 'gray'}
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
      {activeTab === 'data' && (
        <>
          {/* Title, metadata and actions */}
          <div className='flex items-center justify-start px-4 py-1 text-xs'>
            <p className='ml-0 hidden text-gray-400 lg:inline'>{title}</p>
            <p className='inline text-[8px] text-irmin_blue md:ml-auto md:pl-2 lg:text-xs dark:text-irmin_green'>
              {metadata && metadata.rowsReturned && metadata.timeTaken
                ? `
                ${metadata.rowsReturned} ${dict.query.rowsReturnedIn} ${metadata.timeTaken}s
              `
                : ``}
            </p>
            <div className='flex-grow'></div>
            <div className='ml-auto flex flex-row items-center gap-2'>
              {data && (
                <Button
                  icon={<AiOutlineDownload />}
                  colorScheme='secondary'
                  variant='link'
                  size='sm'
                  className='hidden lg:inline-flex dark:text-white'
                  onClick={() => downloadCSV(data ?? [], title)}
                >
                  {dict.query.exportTable}
                </Button>
              )}
              <input
                type='text'
                className='h-8 w-48 rounded-md border border-solid border-gray-400 px-2 py-1 text-xs focus:outline-none dark:border-gray-800'
                placeholder={dict.query.search}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
          {/* Table */}
          <div className='flex h-0 flex-1 flex-col overflow-hidden'>
            {processingRun || loading ? <LoadingSkeleton /> : <></>}
            {!data || !filteredItems || filteredItems.length === 0 ? (
              <div className='w-full px-4 py-12 text-center text-gray-400'>
                {dict.query.noResults}
              </div>
            ) : (
              <AdvancedDatatable items={!loading ? filteredItems : []} />
            )}
          </div>
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
              rows={20}
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
