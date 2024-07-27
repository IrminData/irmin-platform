'use client';

import React, { useState } from 'react';

import DataTable from 'react-data-table-component';

import { AiOutlineDownload } from 'react-icons/ai';

import WidgetCreationForm from '@/components/dashboards/widgetCreationForm';
import MDXEditor from '@/components/editor/mdx-editor/MDXEditor';
import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

import { Dataset } from '@/types/api/Dataset';

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
 * Dataset Viewer component
 *
 * When a dataset is selected, this component is used to view the dataset.
 * Components for viewing the data, creating widgets, and editing documentation are included.
 *
 * @todo Datasets consist of multiple tables. This component should have a way to switch between tables.
 * @todo Fetch real data based on the dataset
 */
const DatasetViewer: React.FC<{
  dataset: Dataset;
}> = ({ dataset }) => {
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDocumentation, setCurrentDocumentation] = useState(
    dataset.documentation ?? ''
  );
  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  return (
    <>
      {/* Tab Buttons */}
      <div className='scrollbar-hide mb-4 flex w-full justify-start gap-6 overflow-y-scroll px-2 pt-2 md:gap-4'>
        <Button
          onClick={() => setActiveTab('data')}
          size='sm'
          className={`rounded-none border-b-2 ${
            activeTab === 'data' ? 'border-irmin_green' : 'border-transparent'
          }`}
        >
          {dict.actionResults.actionResults}
        </Button>
        <Button
          onClick={() => setActiveTab('widget')}
          size='sm'
          className={`rounded-none border-b-2 ${
            activeTab === 'widget' ? 'border-irmin_green' : 'border-transparent'
          }`}
        >
          {dict.actionResults.widget}
        </Button>
        <Button
          onClick={() => setActiveTab('documentation')}
          size='sm'
          className={`rounded-none border-b-2 ${
            activeTab === 'documentation'
              ? 'border-irmin_green'
              : 'border-transparent'
          }`}
        >
          {dict.actionResults.documentation}
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
              className='p-0 text-xs'
            >
              {documentationTab === 'mdx'
                ? dict.actionResults.switchToPlainText
                : dict.actionResults.switchToMarkdownEditor}
            </Button>
          )}
        </div>
      </div>
      {/* Tab Content */}
      <div>
        {activeTab === 'data' && (
          <div className='overflow-auto'>
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
                  {dict.actionResults.exportTable}
                </Button>
              </div>
            </div>
            {/* Table */}
            <div className='overflow-auto'>
              <DataTable columns={placeholderColumns} data={placeholderData} />
            </div>
          </div>
        )}

        {activeTab === 'widget' && (
          <div className='grid grid-cols-2 px-2 py-0'>
            <div>
              <h3 className='p-4 font-medium'>
                {dict.actionResults.addNewWidget}
              </h3>
              <WidgetCreationForm />
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className='overflow-auto'>
            {documentationTab === 'plain' && (
              <textarea
                className='h-full w-full p-2 focus:outline-none'
                placeholder={dict.actionResults.startTypingDocumentation}
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
                placeholder={dict.actionResults.startTypingDocumentation}
                markdown={currentDocumentation}
                onChange={(markdown) => {
                  setCurrentDocumentation(markdown);
                }}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DatasetViewer;
