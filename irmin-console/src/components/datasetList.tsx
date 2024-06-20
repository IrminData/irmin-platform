'use client';

import Link from 'next/link';
import React from 'react';

interface DataSet {
  id: number;
  name: string;
  sourceWorkspace: string;
  status: 'private' | 'public' | 'connected';
}

interface DataSetListProps {
  dataSets: DataSet[];
  inSidebar?: boolean;
}

const DataSetList: React.FC<DataSetListProps> = ({
  dataSets,
  inSidebar = false,
}) => {
  return (
    <div className='pb-8'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left font-light text-rich_black'>
          {!inSidebar && (
            <thead className='text-md border-b-4 border-ash_gray uppercase'>
              <tr>
                <th
                  scope='col'
                  className='px-4 py-2 text-xs font-medium xl:text-sm'
                >
                  Name
                </th>
                <th
                  scope='col'
                  className='px-4 py-2 text-xs font-medium xl:text-sm'
                >
                  Status
                </th>
                <th
                  scope='col'
                  className='px-4 py-2 text-right text-xs font-medium xl:text-sm'
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {dataSets.map((dataSet, index) => (
              <>
                <tr key={index}>
                  <td className='xl:text-md min-w-44 px-4 py-2 text-sm'>
                    {dataSet.name}
                    <br />
                    <span className='text-xs text-ash_gray xl:text-sm'>
                      {dataSet.sourceWorkspace}
                    </span>
                  </td>
                  {!inSidebar ? (
                    <>
                      <td className='px-4 py-2'>
                        {dataSet.status === 'private' ? (
                          <span className='block max-w-36 rounded-full bg-midnight_green px-1 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                            Private
                          </span>
                        ) : dataSet.status === 'public' ? (
                          <span className='block max-w-36 rounded-full bg-ash_gray px-1 py-1 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                            Public
                          </span>
                        ) : (
                          <span className='block max-w-36 rounded-full bg-beige px-1 py-1 text-center text-xs leading-6 text-rich_black shadow-sm xl:text-base'>
                            Connected
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-right'>
                        <div className='float-right flex space-x-2 text-xs xl:text-base'>
                          <Link
                            href='#'
                            className='px-1 py-3 text-ash_gray hover:underline'
                          >
                            Logs
                          </Link>
                          {(dataSet.status === 'private' ||
                            dataSet.status === 'public') && (
                            <>
                              <Link
                                href='#'
                                className='px-1 py-3 text-ash_gray hover:underline'
                              >
                                Edit
                              </Link>
                              <Link
                                href='#'
                                className='px-1 py-3 text-ash_gray hover:underline'
                              >
                                Remove
                              </Link>
                            </>
                          )}
                          {dataSet.status === 'connected' && (
                            <>
                              <Link
                                href='#'
                                className='px-1 py-3 text-ash_gray hover:underline'
                              >
                                View listing
                              </Link>
                              <Link
                                href='#'
                                className='px-1 py-3 text-ash_gray hover:underline'
                              >
                                Disconnect
                              </Link>
                            </>
                          )}

                          <div className='pl-2'>
                            <Link
                              className='mb-2 block w-44 rounded-full bg-midnight_green px-5 py-2 text-center leading-6 text-white shadow-sm hover:bg-midnight_green-600 focus:ring-2 focus:ring-midnight_green-500 focus:ring-opacity-50'
                              href={`data-sets/viewer/${dataSet.id}`}
                            >
                              View data set
                            </Link>
                            {dataSet.status === 'private' && (
                              <Link
                                className='mb-2 block w-44 rounded-full bg-ash_gray-500 px-5 py-2 text-center leading-6 text-white shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
                                href='#'
                              >
                                Publish data set
                              </Link>
                            )}
                            {dataSet.status === 'public' && (
                              <Link
                                className='mb-2 block w-44 rounded-full bg-ash_gray-500 px-5 py-2 text-center leading-6 text-white shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
                                href='#'
                              >
                                View listing
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <></>
                  )}
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSetList;
