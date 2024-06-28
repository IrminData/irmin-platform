'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';
import { ConnectionWithAdditionalData } from '@/types/Connection';

const ConnectionTable = ({
  connections,
  inSidebar = false,
}: {
  connections: ConnectionWithAdditionalData[];
  inSidebar?: boolean;
}) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prevOpenRows) => ({
      ...prevOpenRows,
      [id]: !prevOpenRows[id],
    }));
  };

  if (!connections.length) {
    return (
      <div className='text-center text-lg text-rich_black'>
        No connections found
      </div>
    );
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
            {connections.map((connection, index) => (
              <>
                <tr
                  key={connection.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } cursor-pointer transition-all hover:bg-gray-200`}
                >
                  <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                    {connection.name}
                    <br />
                    <span className='text-xs text-midnight_green'>
                      {connection.connector}
                    </span>
                  </td>
                  {!inSidebar && (
                    <>
                      <td className='min-w-44 px-4 py-2 text-xs xl:text-base'>
                        {connection.nextSync}
                        <br />
                        <span className='text-xs text-midnight_green'>
                          {connection.nextSyncTimestamp.toUTCString()}
                        </span>
                      </td>
                      <td className='px-4 py-2 text-xs xl:text-base'>
                        {connection.status === 'errors' ? (
                          <span className='block max-w-36 rounded-full bg-midnight_green px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Errors
                          </span>
                        ) : connection.status === 'running' ? (
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
                            onClick={() => toggleRow(connection.id)}
                            className='ml-2 mt-1 text-midnight_green hover:text-ash_gray focus:outline-none'
                          >
                            {openRows[connection.id] ? (
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
                {openRows[connection.id] && (
                  <tr className='bg-gray-100 shadow-inner'>
                    <td colSpan={4} className='px-10 py-2'>
                      <ul>
                        {connection.parts.map((part, index) => (
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
