'use client';

import React, { useEffect, useRef, useState } from 'react';
import DataTable from 'react-data-table-component';
import { AiOutlineSave, AiOutlineDownload } from 'react-icons/ai';
import { MdPlayArrow } from 'react-icons/md';

import BarChart from '@/components/widgets/barChart';
import LineChart from '@/components/widgets/lineChart';
import ScrollableTable from '@/components/widgets/scrollableTable';
import MDXEditor from '@/components/mdx-editor/MDXEditor';
import VisualisationCreationForm from './visualisationCreationForm';
import { DataSet } from '@/types/DataSet';

const QueryResultsAndTabs: React.FC<{
  editorHeight: string;
  dataSet: DataSet;
}> = ({ editorHeight, dataSet }) => {
  const [activeTab, setActiveTab] = useState('queryResults');

  const tableRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState('0px');

  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  const updateTableHeight = () => {
    const rect = tableRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetTop = rect.top + window.scrollY; // Distance from the top of the document to the element
      const windowHeight = window.innerHeight; // Height of the viewport
      const maxHeight = windowHeight - offsetTop; // Remaining height below the element
      setTableMaxHeight(`${maxHeight - 20}px`);
    }
  };

  useEffect(() => {
    updateTableHeight(); // Update on mount
    window.addEventListener('resize', updateTableHeight); // Update on window resize
    return () => window.removeEventListener('resize', updateTableHeight); // Cleanup on unmount
  }, [editorHeight]);

  return (
    <div>
      {/* Tab Buttons */}
      <div className='mb-4 flex justify-between px-4 pt-2'>
        <div>
          <button
            onClick={() => setActiveTab('queryResults')}
            className={`border-b-2 px-4 py-2 ${
              activeTab === 'queryResults'
                ? 'border-ash_gray'
                : 'border-transparent'
            } lg:text-md text-sm focus:outline-none`}
          >
            Query Results
          </button>
          <button
            onClick={() => setActiveTab('visualisation')}
            className={`border-b-2 px-4 py-2 ${
              activeTab === 'visualisation'
                ? 'border-ash_gray'
                : 'border-transparent'
            } lg:text-md text-sm focus:outline-none`}
          >
            Visualisation
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`border-b-2 px-4 py-2 ${
              activeTab === 'documentation'
                ? 'border-ash_gray'
                : 'border-transparent'
            } lg:text-md text-sm focus:outline-none`}
          >
            Documentation
          </button>
        </div>
        <div className='text-right'>
          <button className='lg:text-md my-1 rounded border px-4 py-2 text-sm text-gray-800 shadow transition-all hover:bg-gray-200 focus:outline-none'>
            <AiOutlineSave className='inline' /> Save
          </button>
          {dataSet.source !== 'connection' && (
            <button className='lg:text-md my-1 rounded border px-4 py-2 text-sm text-gray-800 shadow transition-all hover:bg-gray-200 focus:outline-none lg:ml-2'>
              <MdPlayArrow className='inline' /> Run script
            </button>
          )}
        </div>
      </div>

      <div ref={tableRef}>
        {activeTab === 'visualisation' && (
          <div
            className='grid grid-cols-2 px-2 py-0'
            style={{ maxHeight: tableMaxHeight }}
          >
            <div>
              <h3 className='p-4 font-medium'>Existing visualisations</h3>
              <div className='flex flex-col gap-10'>
                {dataSet.visualisations.map((visualisation) => {
                  switch (visualisation.type) {
                    case 'table':
                      return (
                        <ScrollableTable
                          key={`visualisation-${visualisation.id}-${visualisation.type}`}
                          visualisation={visualisation}
                        />
                      );
                    case 'line':
                      return (
                        <LineChart
                          key={`visualisation-${visualisation.id}-${visualisation.type}`}
                          visualisation={visualisation}
                        />
                      );
                    case 'bar':
                      return (
                        <BarChart
                          key={`visualisation-${visualisation.id}-${visualisation.type}`}
                          visualisation={visualisation}
                        />
                      );
                  }
                })}
              </div>
            </div>
            <div>
              <h3 className='p-4 font-medium'>Add new visualisation</h3>
              <VisualisationCreationForm />
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div style={{ height: tableMaxHeight }} className='overflow-auto'>
            {/* Documentation Editor */}
            <div className='pr-4 text-right'>
              <button
                onClick={() =>
                  setDocumentationTab(
                    documentationTab === 'mdx' ? 'plain' : 'mdx'
                  )
                }
                className='text-gray text-xs hover:underline'
              >
                {documentationTab === 'mdx'
                  ? 'Switch to plain text'
                  : 'Switch to markdown editor'}
              </button>
            </div>
            {documentationTab === 'plain' && (
              <textarea
                className='h-full w-full p-2 focus:outline-none'
                placeholder='Start typing your documentation and notes here...'
                value={dataSet.documentation ?? ''}
                onChange={(e) => {
                  // TODO: Update the dataset documentation
                  console.log(e.target.value);
                }}
              />
            )}
            {documentationTab === 'mdx' && (
              <MDXEditor
                className='h-full w-full focus:outline-none'
                contentEditableClassName='h-full w-full p-2 focus:outline-none'
                placeholder='Start typing your documentation and notes here...'
                markdown={dataSet.documentation ?? ''}
                onChange={(markdown) => {
                  // TODO: Update the dataset documentation
                  console.log(markdown);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'queryResults' && (
          <div style={{ maxHeight: tableMaxHeight }} className='overflow-auto'>
            {/* Action Buttons */}
            <div className='flex justify-between border px-4 py-2 text-sm'>
              <p className='ml-0 inline font-normal'>
                {`${dataSet.data.length} rows returned in 1.5s`}
              </p>
              <div className='text-right'>
                <button className='text-gray hover:underline'>
                  <AiOutlineDownload className='inline' /> export table (.csv)
                </button>
              </div>
            </div>
            {/* Table */}
            <div className='overflow-auto'>
              <DataTable
                columns={dataSet.columns.map((column) => ({
                  name: column.name,
                  selector: (row: any) => row[column.selector],
                  sortable: true,
                }))}
                data={dataSet.data}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryResultsAndTabs;
