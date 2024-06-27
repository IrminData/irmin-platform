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

interface ConnectionTableProps {
  dataSources: DataSource[];
  inSidebar?: boolean;
}

const ConnectionTable: React.FC<ConnectionTableProps> = ({
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
                  className='px-4 py-2 text-xs font-normal xl:text-sm'
                >
                  Next sync
                </th>
                <th
                  scope='col'
                  className='px-4 py-2 text-xs font-normal xl:text-sm'
                >
                  Status
                </th>
                <th
                  scope='col'
                  className='px-4 py-2 text-right text-xs font-normal xl:text-sm'
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}

          <tbody>
            {dataSources.map((dataSource, index) => (
              <>
                <tr
                  key={dataSource.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } cursor-pointer transition-all hover:bg-gray-200`}
                >
                  <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                    {dataSource.name}
                    <br />
                    <span className='text-xs text-midnight_green'>
                      {dataSource.connector}
                    </span>
                  </td>
                  {!inSidebar && (
                    <>
                      <td className='min-w-44 px-4 py-2 text-xs xl:text-base'>
                        {dataSource.nextSync}
                        <br />
                        <span className='text-xs text-midnight_green'>
                          {dataSource.nextSyncTimestamp.toUTCString()}
                        </span>
                      </td>
                      <td className='px-4 py-2 text-xs xl:text-base'>
                        {dataSource.status === 'errors' ? (
                          <span className='block max-w-36 rounded-full bg-midnight_green px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Errors
                          </span>
                        ) : dataSource.status === 'running' ? (
                          <span className='block max-w-36 rounded-full bg-air_force_blue-600 px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Running
                          </span>
                        ) : (
                          <span className='block max-w-36 rounded-full bg-air_force_blue px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Stopped
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-right text-xs xl:text-base'>
                        <div className='flex justify-end space-x-2'>
                          <Link
                            href='#'
                            className='px-2 py-1 text-midnight_green hover:underline'
                          >
                            Logs
                          </Link>
                          <Link
                            href='#'
                            className='px-2 py-1 text-midnight_green hover:underline'
                          >
                            Edit
                          </Link>
                          <Link
                            href='#'
                            className='px-2 py-1 text-midnight_green hover:underline'
                          >
                            Remove
                          </Link>
                          <button
                            onClick={() => toggleRow(dataSource.id)}
                            className='ml-2 mt-1 text-midnight_green hover:text-ash_gray focus:outline-none'
                          >
                            {openRows[dataSource.id] ? (
                              <IoChevronUpOutline className='h-5 w-5' />
                            ) : (
                              <IoChevronDownOutline className='h-5 w-5' />
                            )}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                {openRows[dataSource.id] && (
                  <tr className='bg-gray-100 shadow-inner'>
                    <td colSpan={4} className='px-10 py-2'>
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

export default ConnectionTable;
