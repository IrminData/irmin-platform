'use client';

import React, { useEffect, useRef, useState } from 'react';

import DataTable from 'react-data-table-component';

import { AiOutlineDownload, AiOutlineSave } from 'react-icons/ai';
import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { MdPlayArrow } from 'react-icons/md';

import MDXEditor from '@/components/editor/mdx-editor/MDXEditor';
import Button from '@/components/misc/Button';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';

import { ActionWorkflow } from '@/types/api/Workflow';

/**
 * Placeholder data for the table
 */
const placeholderData = [
  { name: 'John Doe', age: 25, city: 'New York', country: 'USA' },
  { name: 'Jane Doe', age: 26, city: 'Toronto', country: 'Canada' },
  { name: 'John Smith', age: 30, city: 'London', country: 'UK' },
  { name: 'Jane Smith', age: 22, city: 'Paris', country: 'France' },
  { name: 'John Johnson', age: 28, city: 'Berlin', country: 'Germany' },
  { name: 'Jane Johnson', age: 29, city: 'Tokyo', country: 'Japan' },
  { name: 'John Williams', age: 27, city: 'Sydney', country: 'Australia' },
  {
    name: 'Jane Williams',
    age: 24,
    city: 'Cape Town',
    country: 'South Africa',
  },
  { name: 'John Brown', age: 23, city: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Jane Brown', age: 31, city: 'Moscow', country: 'Russia' },
  { name: 'John Davis', age: 33, city: 'Beijing', country: 'China' },
  { name: 'Jane Davis', age: 32, city: 'New Delhi', country: 'India' },
  { name: 'John Miller', age: 34, city: 'Seoul', country: 'South Korea' },
  { name: 'Jane Miller', age: 35, city: 'Cairo', country: 'Egypt' },
  {
    name: 'John Wilson',
    age: 36,
    city: 'Cape Town',
    country: 'South Africa',
  },
  { name: 'Jane Wilson', age: 37, city: 'Lagos', country: 'Nigeria' },
  { name: 'John Moore', age: 38, city: 'Mexico City', country: 'Mexico' },
  { name: 'Jane Moore', age: 39, city: 'Buenos Aires', country: 'Argentina' },
  { name: 'John Taylor', age: 40, city: 'Santiago', country: 'Chile' },
  { name: 'Jane Taylor', age: 41, city: 'Helsinki', country: 'Finland' },
];
const placeholderColumns = [
  {
    name: 'Name',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.name,
  },
  {
    name: 'Age',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.age,
  },
  {
    name: 'City',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.city,
  },
  {
    name: 'Country',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.country,
  },
];

/**
 * Editor Results component
 *
 * Used by the Editor page to display the results of the file being edited and executed.
 *
 * When actionWorkflow is provided to this component it will show a documentation tab to
 * write and save documentation for the action.
 */
const EditorResults: React.FC<{
  editorHeight: string;
  actionWorkflow?: ActionWorkflow;
}> = ({ editorHeight, actionWorkflow }) => {
  const { openFileTabs } = useBucket();
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const tableRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState('300px');

  const [currentDocumentation, setCurrentDocumentation] = useState(
    actionWorkflow?.documentation ?? ''
  );
  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  /**
   *  Update the table height when the window is resized
   *  or the editor height changes
   */
  useEffect(() => {
    const updateTableHeight = () => {
      if (!tableRef.current) return;
      if (openFileTabs.length === 0) return;
      const rect = tableRef.current?.getBoundingClientRect();
      if (rect) {
        const offsetTop = rect.top + window.scrollY; // Distance from the top of the document to the element
        const windowHeight = window.innerHeight; // Height of the viewport
        const maxHeight = windowHeight - offsetTop; // Remaining height below the element
        setTableMaxHeight(`${maxHeight}px`);
      }
    };
    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);
    return () => window.removeEventListener('resize', updateTableHeight);
  }, [editorHeight, tableRef, openFileTabs]);

  if (openFileTabs.length === 0) return <></>;
  return (
    <div className='bg-white'>
      {/* Tab Buttons */}
      <div className='scrollbar-hide mb-4 flex w-full justify-start gap-6 overflow-y-scroll px-2 pt-2 md:gap-4'>
        <Button
          onClick={() => setActiveTab('data')}
          size='sm'
          className={`w-44 rounded-none border-b-2 ${
            activeTab === 'data' ? 'border-irmin_green' : 'border-transparent'
          }`}
        >
          {dict.editor.actionResults}
        </Button>
        <Button
          onClick={() => setActiveTab('documentation')}
          size='sm'
          className={`w-44 rounded-none border-b-2 ${
            activeTab === 'documentation'
              ? 'border-irmin_green'
              : 'border-transparent'
          }`}
        >
          {dict.documentation.documentation}
        </Button>
        <div className='ml-auto flex gap-2 text-right'>
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
            {dict.editor.saveAction}
          </Button>
          <Button
            icon={<MdPlayArrow />}
            colorScheme='primary'
            variant='solid'
            size='sm'
            className='text-xs'
          >
            {dict.editor.runAction}
          </Button>
        </div>
      </div>

      <div ref={tableRef}>
        {activeTab === 'data' && (
          <div style={{ maxHeight: tableMaxHeight }} className='overflow-auto'>
            {/* Action Buttons */}
            <div className='flex items-center justify-between border px-4 py-2 text-sm'>
              <p className='ml-0 inline text-xs'>
                {`${placeholderData.length} rows returned in 1.5s`}
              </p>
              <div className='ml-auto'>
                <Button
                  icon={<AiOutlineDownload />}
                  colorScheme='secondary'
                  variant='link'
                  size='sm'
                >
                  {dict.editor.exportTable}
                </Button>
              </div>
            </div>
            {/* Table */}
            <div className='overflow-auto'>
              <DataTable columns={placeholderColumns} data={placeholderData} />
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div style={{ height: tableMaxHeight }} className='overflow-auto'>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorResults;
