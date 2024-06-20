'use client';

import React, { useState } from 'react';

import ScriptEditor from '@/components/scriptEditor';
import QueryResultsAndTabs from '@/components/queryResultsAndTabs';
import { IoChevronBack } from 'react-icons/io5';
import Link from 'next/link';

export default function DataSetEditor() {
  const [editorHeight, setEditorHeight] = useState('400px');

  const dataSet = {
    id: 0,
    name: 'UpCharge rents, users and venues',
    sourceWorkspace: 'UpCharge',
    status: 'private',
    parts: [
      'UpCharge venues with revenue, type, average rent cost and amount of daily rentals',
      'Venue performance by venue type',
      'Venue sales by partner',
      'All rentals with Stripe invoices',
    ],
  };
  return (
    <>
      <div className='flex justify-between p-2'>
        <div className='xl:text-md flex justify-between px-4 py-2 text-sm'>
          <div className='pr-10'>
            <Link href={'..'} title='Back'>
              <IoChevronBack size={40} />
            </Link>
          </div>
          <div className='pr-10'>
            {dataSet.name}
            <br />
            <span className='text-xs text-ash_gray xl:text-sm'>
              {dataSet.sourceWorkspace}
            </span>
          </div>
          <div className='pr-10'>
            {dataSet.status === 'private' ? (
              <span className='block max-w-36 rounded-full bg-midnight_green p-2 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Private
              </span>
            ) : dataSet.status === 'public' ? (
              <span className='block max-w-36 rounded-full bg-ash_gray p-2 text-center text-xs leading-6 text-white shadow-sm xl:text-base'>
                Public
              </span>
            ) : (
              <span className='block max-w-36 rounded-full bg-beige p-2 text-center text-xs leading-6 text-rich_black shadow-sm xl:text-base'>
                Connected
              </span>
            )}
          </div>
        </div>
        <div className='px-4 py-2 text-right'>
          <div className='float-right flex space-x-2 text-xs xl:text-base'>
            <Link href='#' className='px-1 py-3 text-ash_gray hover:underline'>
              Logs
            </Link>
            {(dataSet.status === 'private' || dataSet.status === 'public') && (
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
        </div>
      </div>
      <div className='flex'>
        <div className='-mr-4 inline-block w-full overflow-auto bg-white'>
          <ScriptEditor
            editorHeight={editorHeight}
            setEditorHeight={setEditorHeight}
            hideTabs={true}
          />
          <QueryResultsAndTabs
            editorHeight={editorHeight}
            columns={[
              {
                name: 'Title',
                selector: (row: any) => row.title,
                sortable: true,
              },
              {
                name: 'Year',
                selector: (row: any) => row.year,
                sortable: true,
              },
            ]}
            data={[
              {
                id: 1,
                title: 'Beetlejuice',
                year: '1988',
              },
              {
                id: 2,
                title: 'Ghostbusters',
                year: '1984',
              },
              {
                id: 3,
                title: 'The Shining',
                year: '1980',
              },
              {
                id: 4,
                title: 'The Conjuring',
                year: '2013',
              },
              {
                id: 5,
                title: 'The Thing',
                year: '1982',
              },
              {
                id: 6,
                title: 'The Others',
                year: '2001',
              },
              {
                id: 7,
                title: 'Coraline',
                year: '2009',
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
