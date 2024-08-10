'use client';

import React, { useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import RepositoryTableReferenceList from '@/components/repository/RepositoryTableReferenceList';

/**
 * Component to wrap the query pages in.
 * Provides a sidebar with file navigator and other tools.
 *
 * @param children - The children to render
 */
export default function EditorLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      id='query-layout-wrapper'
      className='flex h-full flex-row content-stretch items-stretch overflow-hidden'
    >
      <div
        className={`absolute z-10 h-[calc(100vh-55px)] overflow-y-scroll border-r bg-gray-50 ${
          !sidebarOpen ? 'max-w-10' : 'max-w-72'
        } w-full lg:relative lg:max-w-72`}
      >
        <button
          id='query-sidebar-toggle-mobile'
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute z-20 bg-gray-100 px-1 py-1 text-irmin_black opacity-60 transition-all hover:opacity-100 focus:outline-none lg:hidden ${!sidebarOpen ? 'text-center' : 'right-0 w-8'}`}
          aria-label='Toggle query sidebar'
        >
          {sidebarOpen ? (
            <IoChevronBack size={24} />
          ) : (
            <IoChevronForward size={24} />
          )}
        </button>
        <div
          id='query-sidebar'
          className={`h-full max-h-[calc(100vh-56px)] w-full transition-all lg:visible lg:ml-0 ${!sidebarOpen ? 'invisible -ml-72' : 'visible ml-0'}`}
        >
          <RepositoryTableReferenceList />
        </div>
      </div>
      <div
        className='ml-10 flex flex-1 flex-col bg-white lg:ml-0'
        id='query-page-content'
      >
        {children}
      </div>
    </div>
  );
}
