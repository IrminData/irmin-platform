'use client';

import Link from 'next/link';
import React from 'react';
import { DataSet } from '@/types/DataSet';

const DatasetTable = ({
  dataSets,
  inSidebar = false,
}: {
  dataSets: DataSet[];
  inSidebar?: boolean;
}) => {
  if (!dataSets || dataSets.length === 0) {
    return <p>No datasets found</p>;
  }
  return (
    <div className='pb-8'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left font-light text-rich_black'>
          {!inSidebar && (
            <thead className='text-md border-b border-ash_gray'>
              <tr>
                <th
                  scope='col'
                  className='px-4 py-2 text-xs font-normal xl:text-sm'
                >
                  Name
                </th>
                <th
                  scope='col'
                  className='max-w-36 px-4 py-2 text-center text-xs font-normal xl:text-sm'
                >
                  Status
                </th>
                <th
                  scope='col'
                  className='py-2 pl-4 pr-6 text-right text-xs font-normal xl:text-sm'
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {dataSets.map((dataSet, index) => (
              <tr
                key={dataSet.id}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } cursor-pointer transition-all hover:bg-gray-200`}
              >
                <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                  {dataSet.name}
                  <br />
                  <span className='text-xs text-midnight_green'>
                    Source: {dataSet.sourceWorkspace}
                  </span>
                </td>
                {!inSidebar && (
                  <>
                    <td className='px-4 py-2'>
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
                    </td>
                    <td className='px-4 py-2 text-right'>
                      <div className='flex justify-end space-x-2 align-middle text-xs xl:text-sm'>
                        <Link href={`data-sets/viewer/${dataSet.id}/logs`}>
                          <button className='px-2 pt-2 text-midnight_green hover:underline'>
                            Logs
                          </button>
                        </Link>
                        {(dataSet.status === 'private' ||
                          dataSet.status === 'public') && (
                          <Link
                            href={`data-sets/viewer/${dataSet.id}/settings`}
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
                            href={`data-sets/viewer/${dataSet.id}`}
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatasetTable;
