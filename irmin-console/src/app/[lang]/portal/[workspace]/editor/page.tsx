'use client';

import React, { useEffect, useState } from 'react';

import { DataSetService } from '@/lib/api/DataSetService';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import ActionEditorWithOptions from '@/components/action-editor/actionEditorWithOptions';
import ActionResultsAndTabs from '@/components/actionResultsAndTabs';
import FileNavigator from '@/components/fileNavigator';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import ConnectionTable from '@/components/tables/connectionTable';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { DataSet } from '@/types/DataSet';

export default function EditorPage() {
  const { locale, dict } = useLocale();
  const dataService = DataSetService.getInstance(locale);
  const { connections } = useWorkspace();

  const [editorHeight, setEditorHeight] = useState('400px');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let fetchedDataSets = await dataService.getAllDataSets();
        if (!fetchedDataSets || fetchedDataSets.length === 0) {
          fetchedDataSets = await dataService.fetchAllDataSets();
        }
        if (fetchedDataSets) setDataSets(fetchedDataSets);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataService]);

  const dataSet = dataSets[0] ?? null;
  return (
    <>
      <div className='flex'>
        <div
          className={`editor-sidebarinline-block overflow-y-scroll bg-gray-50 ${
            !sidebarOpen ? 'w-10' : 'absolute z-10 w-96'
          } xl:w-96`}
          style={{
            height: 'calc(100vh - 94px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='block px-1 py-1 text-xl focus:outline-none xl:hidden'
          >
            {sidebarOpen ? (
              <IoChevronBack className='mr-2 inline-block w-full' />
            ) : (
              <IoChevronForward className='mr-2 inline-block w-full' />
            )}
          </button>
          <div className={`${!sidebarOpen ? 'hidden' : 'block w-96'} xl:block`}>
            <form className='w-full p-3'>
              <div className='relative'>
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3'>
                  <TbSearch className='h-4 w-4 text-gray-500' />
                </div>
                <input
                  type='search'
                  id='default-search'
                  className='block w-full rounded-full border border-gray-300 bg-gray-50 p-2 ps-7 text-xs text-gray-900'
                  placeholder={dict.fileNavigator.searchPlaceholder}
                  required
                />
                <button
                  type='submit'
                  className='absolute bottom-1.5 end-1.5 rounded-full bg-irmin_green px-2 py-1 text-xs font-light text-white hover:bg-irmin_green-400'
                >
                  {dict.fileNavigator.search}
                </button>
              </div>
            </form>
            <br />
            <FileNavigator
              onOpenFile={(name) => {
                console.log('Open file', name);
              }}
              items={[
                {
                  name: 'ecommerce',
                  type: 'folder',
                  children: [
                    { name: 'customer_growth', type: 'file' },
                    { name: 'customer_retention', type: 'file' },
                    { name: 'customer_acquisition', type: 'file' },
                    {
                      name: 'inventory',
                      type: 'folder',
                      children: [
                        { name: 'stock_level', type: 'file' },
                        { name: 'stock_turnover', type: 'file' },
                      ],
                    },
                  ],
                },
                {
                  name: 'finance',
                  type: 'folder',
                  children: [
                    { name: 'cash_flow', type: 'file' },
                    { name: 'profit_margin', type: 'file' },
                    { name: 'revenue', type: 'file' },
                  ],
                },
                {
                  name: 'marketing',
                  type: 'folder',
                  children: [
                    { name: 'customer_growth', type: 'file' },
                    { name: 'customer_retention', type: 'file' },
                    { name: 'customer_acquisition', type: 'file' },
                  ],
                },
                {
                  name: 'sales',
                  type: 'folder',
                  children: [
                    { name: 'customer_growth', type: 'file' },
                    { name: 'customer_retention', type: 'file' },
                    { name: 'customer_acquisition', type: 'file' },
                  ],
                },
              ]}
            />
            <br />
            <div className='max-h-80 overflow-auto border-t p-2'>
              <h3 className='px-4'>{dict.fileNavigator.connections}</h3>
              {connections.isLoading ? (
                <TableSkeleton />
              ) : (
                <ConnectionTable
                  inSidebar={true}
                  connections={connections.connections}
                />
              )}
            </div>
            <br />
            <div className='max-h-80 overflow-auto border-t p-2'>
              <h3 className='px-4'>{dict.fileNavigator.dataSets}</h3>
              {loading ? (
                <TableSkeleton />
              ) : (
                <DatasetTable inSidebar={true} dataSets={dataSets} />
              )}
            </div>
          </div>
        </div>
        <div className='inline-block w-full overflow-auto bg-white'>
          {dataSet ? (
            <>
              <ActionEditorWithOptions
                editorHeight={editorHeight}
                setEditorHeight={setEditorHeight}
              />
              <ActionResultsAndTabs
                editorHeight={editorHeight}
                dataSet={dataSet}
              />
            </>
          ) : (
            <LoadingSpinner />
          )}
        </div>
      </div>
    </>
  );
}
