'use client';

import React from 'react';
import { IoChevronBack } from 'react-icons/io5';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';

export default function DataSetSettings() {
  const { currentWorkspace } = useWorkspace();
  if (!currentWorkspace) return <></>;

  const dataSet = {
    id: 0,
    name: 'UpCharge rents, users and venues',
    sourceWorkspace: 'UpCharge',
    status: 'private',
  };
  return (
    <>
      <div className='flex justify-between px-2'>
        <div className='xl:text-md flex justify-between px-4 py-2 text-sm'>
          <div className='pr-4'>
            <Link href={`/app/${currentWorkspace.slug}/data-sets`} title='Back'>
              <IoChevronBack size={40} className='text-midnight_green' />
            </Link>
          </div>
          <div className='xl:text-md min-w-44 px-4 py-0 pr-10 text-base'>
            {dataSet.name}
            <br />
            <span className='text-xs text-midnight_green'>
              Source: {dataSet.sourceWorkspace}
            </span>
          </div>
          <div className='pr-10 pt-2'>
            {dataSet.status === 'private' ? (
              <span className='block max-w-36 rounded-full bg-air_force_blue-300 px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Private
              </span>
            ) : dataSet.status === 'public' ? (
              <span className='block max-w-36 rounded-full bg-air_force_blue-600 px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Public
              </span>
            ) : (
              <span className='block max-w-36 rounded-full bg-air_force_blue px-4 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Connected
              </span>
            )}
          </div>
        </div>
        <div className='px-4 py-2 text-right'>
          <div className='flex justify-end space-x-2 align-middle text-xs xl:text-base'>
            {(dataSet.status === 'private' || dataSet.status === 'public') && (
              <Link
                href={`/app/${currentWorkspace.slug}/data-sets/viewer/${dataSet.id}/logs`}
              >
                <button className='px-2 pt-2 text-midnight_green hover:underline'>
                  Logs
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
                className='mb-2 block w-20 rounded-full bg-midnight_green px-4 py-2 text-center leading-6 text-white shadow-sm hover:bg-midnight_green-600 focus:outline-none'
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
          <h1>Data set settings</h1>
          {/* TODO: Data set settings page */}
        </div>
      </div>
    </>
  );
}
