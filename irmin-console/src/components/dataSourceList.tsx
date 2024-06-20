'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

interface DataSource {
  id: number;
  name: string;
  connector: string;
  nextSync: string;
  nextSyncTimestamp: Date;
  status: 'running' | 'errors' | 'stopped';
  parts: string[];
}

interface DataSourceListProps {
  dataSources: DataSource[];
  inSidebar?: boolean;
}

const DataSourceList: React.FC<DataSourceListProps> = ({
  dataSources,
  inSidebar = false,
}) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prevOpenRows) => ({
      ...prevOpenRows,
      [id]: !prevOpenRows[id],
    }));
  };

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
                  Next sync
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
            {dataSources.map((dataSource, index) => (
              <>
                <tr key={index}>
                  <td className='xl:text-md min-w-44 px-4 py-2 text-sm'>
                    {dataSource.name}
                    <br />
                    <span className='text-xs text-ash_gray'>
                      {dataSource.connector}
                    </span>
                  </td>
                  {!inSidebar ? (
                    <>
                      <td className='min-w-44 px-4 py-2 text-xs xl:text-base'>
                        {dataSource.nextSync}
                        <br />
                        <span className='text-ash_gray'>
                          {dataSource.nextSyncTimestamp.toUTCString()}
                        </span>
                      </td>
                      <td className='px-4 py-2 text-xs xl:text-base'>
                        {dataSource.status === 'errors' ? (
                          <span className='block max-w-36 rounded-full bg-midnight_green px-1 py-1 text-center leading-6 text-white shadow-sm'>
                            Errors
                          </span>
                        ) : dataSource.status === 'running' ? (
                          <span className='block max-w-36 rounded-full bg-ash_gray px-1 py-1 text-center leading-6 text-white shadow-sm'>
                            Running
                          </span>
                        ) : (
                          <span className='block max-w-36 rounded-full bg-beige px-1 py-1 text-center leading-6 text-rich_black shadow-sm'>
                            Stopped
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-right text-xs xl:text-base'>
                        <div className='inline-flex space-x-2'>
                          <Link
                            href='#'
                            className='px-1 py-3 text-ash_gray hover:underline'
                          >
                            Logs
                          </Link>
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
                        </div>
                        <button
                          onClick={() => toggleRow(dataSource.id)}
                          className='float-right ml-4 mt-4 inline text-ash_gray hover:text-ash_gray-800 focus:outline-none'
                        >
                          {openRows[dataSource.id] ? (
                            <IoChevronUpOutline className='h-5 w-5' />
                          ) : (
                            <IoChevronDownOutline className='h-5 w-5' />
                          )}
                        </button>
                      </td>
                    </>
                  ) : (
                    <td className='px-4 py-2 text-right text-xs xl:text-base'>
                      <button
                        onClick={() => toggleRow(dataSource.id)}
                        className='float-right ml-4 mt-4 inline text-ash_gray hover:text-ash_gray-800 focus:outline-none'
                      >
                        {openRows[dataSource.id] ? (
                          <IoChevronUpOutline className='h-5 w-5' />
                        ) : (
                          <IoChevronDownOutline className='h-5 w-5' />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
                {openRows[dataSource.id] && (
                  <tr className='shadow'>
                    <td colSpan={3} className='px-10 py-2'>
                      <ul>
                        {dataSource.parts.map((part, index) => (
                          <li
                            key={index}
                            className='border-color-ash_gray border-b py-2 text-xs'
                          >
                            {part}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSourceList;
