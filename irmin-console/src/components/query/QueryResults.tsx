'use client';

import { useEffect, useState } from 'react';

import { AiOutlineDownload, AiOutlineSave } from 'react-icons/ai';
import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { MdPlayArrow } from 'react-icons/md';
import { TbFileText, TbTable } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';
import AdvancedDatatable from '@/components/query/datatables/AdvancedDatatable';

import { useLocale } from '@/context/LocaleContext';

import { downloadCSV } from '@/utils/csv';

import { ActionWorkflow } from '@/types/api/Workflow';
import { placeholderData } from '@/types/examples/datatableData';

/**
 * Query Results component
 *
 * Used by different pages to display  results of files, actions, queries, etc.
 */
const QueryResults = ({
  title,
  actionWorkflow,
}: {
  title: string;
  actionWorkflow?: ActionWorkflow;
}) => {
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDocumentation, setCurrentDocumentation] = useState(
    actionWorkflow?.documentation ?? ''
  );
  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  const [filterText, setFilterText] = useState('');
  const [filteredItems, setFilteredItems] = useState(placeholderData);

  // Update the filtered items when the filter text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterText && filterText.length > 0) {
        const newData = placeholderData.filter((item) => {
          return Object.keys(item).some((key) => {
            const value =
              key in item ? item[key as keyof typeof item] : undefined;
            return (
              value &&
              value.toString().toLowerCase().includes(filterText.toLowerCase())
            );
          });
        });
        setFilteredItems(newData);
      } else {
        setFilteredItems(placeholderData);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filterText]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden' id='query-results'>
      {/* Tab Buttons */}
      <div className='mb-0 mt-4 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b'>
        <div
          className={`border-irmin_green bg-white ${activeTab === 'data' ? 'border-b-2' : ''}`}
        >
          <Button
            ariaLabel={`Switch to data viewer tab`}
            size='sm'
            variant='outline'
            colorScheme={activeTab === 'data' ? 'secondary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline`}
            onClick={() => setActiveTab('data')}
            icon={<TbTable />}
          >
            {dict.query.results}
          </Button>
        </div>
        {actionWorkflow && (
          <div
            className={`border-irmin_green bg-white ${activeTab === 'documentation' ? 'border-b-2' : ''}`}
          >
            <Button
              ariaLabel={`Switch to documentation tab`}
              size='sm'
              variant='outline'
              colorScheme={activeTab === 'documentation' ? 'secondary' : 'gray'}
              className={`justify-start rounded-none text-xs shadow-none hover:no-underline`}
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
              className='min-w-48 p-0 text-xs'
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
          <Button
            icon={<AiOutlineSave />}
            colorScheme='light'
            variant='solid'
            size='sm'
            className='text-xs'
          >
            {dict.query.save}
          </Button>
          <Button
            icon={<MdPlayArrow />}
            colorScheme='primary'
            variant='solid'
            size='sm'
            className='text-xs'
          >
            {dict.query.run}
          </Button>
        </div>
      </div>
      {activeTab === 'data' && (
        <>
          {/* Title, metadata and actions */}
          <div className='flex items-center justify-start border px-4 py-1 text-xs'>
            <p className='ml-0 inline text-gray-400'>{title}</p>
            <p className='inline text-irmin_blue md:ml-auto md:pl-2'>
              {`${placeholderData.length} ${dict.query.rowsReturnedIn} 1.5s`}
            </p>
            <div className='flex-grow'></div>
            <div className='ml-auto flex flex-row gap-2'>
              <Button
                icon={<AiOutlineDownload />}
                colorScheme='secondary'
                variant='link'
                size='sm'
                onClick={() => downloadCSV(placeholderData, title)}
              >
                {dict.query.exportTable}
              </Button>
              <input
                type='text'
                className='h-8 w-48 rounded-md px-2 py-1 text-xs shadow focus:outline-none'
                placeholder={dict.query.search}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
          {/* Table */}
          <div className='flex h-0 flex-1 overflow-hidden'>
            {!filteredItems || filteredItems.length === 0 ? (
              <div className='w-full px-4 py-12 text-center text-gray-400'>
                {dict.query.noResults}
              </div>
            ) : (
              <AdvancedDatatable items={filteredItems} />
            )}
          </div>
        </>
      )}
      {activeTab === 'documentation' && (
        <>
          {documentationTab === 'plain' && (
            <textarea
              className='h-full w-full p-2 focus:outline-none'
              placeholder={dict.documentation.startTypingDocumentation}
              value={currentDocumentation}
              onChange={(e) => {
                setCurrentDocumentation(e.target.value);
              }}
            />
          )}
          {documentationTab === 'mdx' && (
            <MDXEditor
              className='h-full w-full focus:outline-none'
              contentEditableClassName='h-full w-full p-2 focus:outline-none'
              placeholder={dict.documentation.startTypingDocumentation}
              markdown={currentDocumentation}
              onChange={(markdown) => {
                setCurrentDocumentation(markdown);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default QueryResults;
