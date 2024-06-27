'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IoChevronBack } from 'react-icons/io5';
import { useWorkspace } from '@/context/WorkspaceContext';
import { DataSetService } from '@/lib/DataSetService';
import { DataSet } from '@/types/DataSet';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

export default function DataSetLogs() {
  const { dataSetID } = useParams();
  const { currentWorkspace } = useWorkspace();
  const dataService = DataSetService.getInstance();

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

  if (!currentWorkspace) return <></>;
  if (!dataSet) return <LoadingSpinner />;
  return (
    <>
      <div className='flex justify-between overflow-x-scroll border-b-2 border-ash_gray px-0'>
        <div className='xl:text-md flex justify-between px-4 py-2 text-sm'>
          <div className='pr-4'>
            <Link href={`/app/${currentWorkspace.slug}/data-sets`} title='Back'>
              <IoChevronBack size={40} className='text-midnight_green' />
            </Link>
          </div>
          <div className='xl:text-md min-w-64 px-4 py-0 pr-5 text-base md:min-w-44 md:pr-10'>
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
          </div>
          <div className='pr-5 pt-2 md:pr-10'>
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
        <div className='min-w-56 px-2 py-2 text-right md:px-4'>
          <div className='flex justify-end space-x-2 align-middle text-xs xl:text-sm'>
            {(dataSet.status === 'private' || dataSet.status === 'public') && (
              <Link
                href={`/app/${currentWorkspace.slug}/data-sets/viewer/${dataSet.id}/settings`}
              >
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

            <div className='pl-2'>
              <Link
                className='mb-2 block w-20 rounded-full bg-ash_gray px-4 py-2 text-center leading-6 text-white shadow-sm hover:bg-ash_gray-400 focus:outline-none'
                href={`/app/${currentWorkspace.slug}/data-sets/viewer/${dataSet.id}`}
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className='flex'>
        <div className='-mr-4 inline-block w-full overflow-auto bg-white'>
          <h1>Runtime logs</h1>
          {/* TODO: DataSet Logs page */}
        </div>
      </div>
    </>
  );
}
