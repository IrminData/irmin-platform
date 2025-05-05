'use client';

import { useState } from 'react';

import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';

import { QueryProvider } from '@/context/QueryContext';

import FileNavigator from './FileNavigator';

/**
 * Component to wrap the editor pages in.
 * Provides a sidebar with file navigator and other tools.
 *
 * @param props - The props to pass to the component
 * @param props.children - The children to render
 */
export default function EditorLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      id='editor-layout-wrapper'
      className='flex h-full flex-row content-stretch items-stretch overflow-hidden'
    >
      <div
        className={`bg-background absolute z-10 h-full w-full overflow-y-scroll border-r dark:border-r-gray-800 ${
          !sidebarOpen ? 'max-w-10' : 'max-w-72'
        } lg:static lg:max-w-72 lg:min-w-72`}
      >
        <button
          id='editor-sidebar-toggle-mobile'
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`text-foreground absolute z-20 w-10 bg-gray-100 px-1 py-1 text-center opacity-60 transition-all hover:opacity-100 focus:outline-hidden lg:hidden dark:bg-gray-800 ${sidebarOpen ? 'right-0' : ''}`}
          aria-label='Toggle editor sidebar'
        >
          {sidebarOpen ? (
            <TbChevronLeft size={24} />
          ) : (
            <TbChevronRight size={24} />
          )}
        </button>
        <div
          id='editor-sidebar'
          className={`flex h-full max-h-full w-full flex-col gap-4 transition-all lg:visible lg:ml-0 ${!sidebarOpen ? 'invisible -ml-72' : 'visible ml-0'}`}
        >
          <FileNavigator />
        </div>
      </div>
      <div className='ml-10 flex-1 shrink overflow-hidden lg:ml-0'>
        <div
          className='bg-background flex h-full w-full flex-col'
          id='editor-page-content'
        >
          <QueryProvider>{children}</QueryProvider>
        </div>
      </div>
    </div>
  );
}
