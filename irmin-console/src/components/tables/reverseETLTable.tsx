'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

interface ReverseETLProcess {
  id: number;
  name: string;
  source: string;
  destination: string;
  status: 'active' | 'inactive' | 'failed';
  details: string[];
}

interface ReverseETLTableProps {
  processes: ReverseETLProcess[];
  inSidebar?: boolean;
}

const ReverseETLTable: React.FC<ReverseETLTableProps> = ({
  processes,
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
                <th scope='col' className='px-4 py-2 text-xs font-normal'>
                  Name
                </th>
                <th scope='col' className='px-4 py-2 text-xs font-normal'>
                  Source data set
                </th>
                <th scope='col' className='px-4 py-2 text-xs font-normal'>
                  Destination
                </th>
                <th scope='col' className='px-4 py-2 text-xs font-normal'>
                  Status
                </th>
                <th
                  scope='col'
                  className='px-4 py-2 text-right text-xs font-normal'
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}

          <tbody>
            {processes.map((process, index) => (
              <>
                <tr
                  key={process.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } transition-all hover:bg-gray-200`}
                >
                  <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                    {process.name}
                  </td>
                  <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                    {process.source}
                  </td>
                  <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                    {process.destination}
                  </td>
                  {!inSidebar && (
                    <>
                      <td className='px-4 py-2 text-xs xl:text-base'>
                        {process.status === 'active' ? (
                          <span className='block max-w-36 rounded-full bg-air_force_blue-600 px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Active
                          </span>
                        ) : process.status === 'inactive' ? (
                          <span className='block max-w-36 rounded-full bg-air_force_blue px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Inactive
                          </span>
                        ) : (
                          <span className='block max-w-36 rounded-full bg-midnight_green px-2 py-1 text-center leading-6 text-white shadow-sm'>
                            Failed
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
                            onClick={() => toggleRow(process.id)}
                            className='ml-2 mt-1 text-midnight_green hover:text-ash_gray focus:outline-none'
                          >
                            {openRows[process.id] ? (
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
                {openRows[process.id] && (
                  <tr className='bg-gray-100 shadow-inner'>
                    <td colSpan={5} className='px-10 py-2'>
                      <ul>
                        {process.details.map((detail, index) => (
                          <li
                            key={index}
                            className='border-color-ash_gray border-b py-2 text-xs'
                          >
                            {detail}
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

export default ReverseETLTable;
