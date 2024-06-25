'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IoChevronBack } from 'react-icons/io5';
import ScriptEditor from '@/components/script-editor/scriptEditor';
import QueryResultsAndTabs from '@/components/queryResultsAndTabs';
import { DataSetService } from '@/lib/DataSetService';
import { DataSet } from '@/types/DataSet';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

export default function DataSetEditor() {
  const { dataSetID } = useParams();
  const dataService = DataSetService.getInstance();
  const [editorHeight, setEditorHeight] = useState('400px');

  const [dataSet, setDataSet] = useState<DataSet | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      let dataSet = await dataService.getDataSetById(Number(dataSetID));
      if (!dataSet) {
        dataSet = await dataService.fetchDataSetById(Number(dataSetID));
      }
      if (dataSet) setDataSet(dataSet);
    };

    fetchData();
  }, [dataSetID, dataService]);

  if (!dataSet) return <LoadingSpinner />;
  return (
    <>
      <div className='flex justify-between px-2'>
        <div className='xl:text-md flex justify-between px-4 py-2 text-sm'>
          <div className='pr-4'>
            <Link href={'..'} title='Back'>
              <IoChevronBack size={40} className='text-midnight_green' />
            </Link>
          </div>
          <div className='xl:text-md min-w-44 px-4 py-0 pr-10 text-base'>
            {dataSet.name}
            <br />
            {dataSet.status === 'connected' ? (
              <span className='text-xs text-midnight_green'>
                Source: {dataSet.sourceWorkspace}
              </span>
            ) : dataSet.source === 'connection' ? (
              <span className='text-xs text-midnight_green'>
                Source connection: {dataSet.sourceConnection}
              </span>
            ) : (
              <span className='text-xs text-midnight_green'>
                File: {dataSet.scriptFile}
              </span>
            )}
            <br />
            <span className='inline-block text-xs text-midnight_green'>
              Refresh schedule: {dataSet.refreshSchedule}
            </span>
          </div>
          <div className='pr-10 pt-2'>
            {dataSet.status === 'private' ? (
              <span className='inline-block max-w-36 rounded-full bg-air_force_blue-300 px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Private
              </span>
            ) : dataSet.status === 'public' ? (
              <span className='inline-block max-w-36 rounded-full bg-air_force_blue-600 px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Public
              </span>
            ) : (
              <span className='inline-block max-w-36 rounded-full bg-air_force_blue px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Connected
              </span>
            )}
          </div>
        </div>
        <div className='px-4 py-2 text-right'>
          <div className='flex justify-end space-x-2 align-middle text-xs xl:text-base'>
            <Link href={`${dataSet.id}/logs`}>
              <button className='px-2 pt-2 text-midnight_green hover:underline'>
                Logs
              </button>
            </Link>
            {(dataSet.status === 'private' || dataSet.status === 'public') && (
              <Link href={`${dataSet.id}/settings`}>
                <button className='px-2 pt-2 text-midnight_green hover:underline'>
                  Edit
                </button>
              </Link>
            )}
            {dataSet.status === 'connected' && (
              <>
                <Link href={'#'}>
                  <button
                    className='px-2 pt-2 text-midnight_green hover:underline'
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement external dataset marketplace popup view
                    }}
                  >
                    View info
                  </button>
                </Link>
                <Link href={'#'}>
                  <button
                    className='px-2 pt-2 text-midnight_green hover:underline'
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement external dataset disconnect flow
                    }}
                  >
                    Disconnect
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className='flex'>
        <div className='-mr-4 inline-block w-full overflow-auto bg-white'>
          {(dataSet.source === 'sql' || dataSet.source === 'python') &&
          dataSet.sourceScript ? (
            <ScriptEditor
              content={dataSet.sourceScript}
              language={dataSet.source === 'sql' ? 'sql' : 'python'}
              editorHeight={editorHeight}
              setEditorHeight={setEditorHeight}
            />
          ) : (
            <div className='p-4'>
              <span className='text-lg text-midnight_green'>
                Connection: {dataSet.sourceConnection}
              </span>
            </div>
          )}
          <QueryResultsAndTabs editorHeight={editorHeight} dataSet={dataSet} />
        </div>
      </div>
    </>
  );
}
