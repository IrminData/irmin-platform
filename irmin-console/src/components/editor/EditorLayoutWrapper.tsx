'use client';

import { useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import CollectionReferenceList from '@/components/repository/collections/CollectionReferenceList';

import { useEditor } from '@/context/EditorContext';
import { QueryProvider } from '@/context/QueryContext';

import { Collection } from '@/types/core/Collection';
import { Repository } from '@/types/core/Repository';

import FileNavigator from './FileNavigator';

/**
 * Component to wrap the editor pages in.
 * Provides a sidebar with file navigator and other tools.
 *
 * @param props - The props to pass to the component
 * @param props.children - The children to render
 * @param props.repositories - The repositories to display in the collection reference list
 * @param props.collections - The collections to display in the collection reference list
 */
export default function EditorLayoutWrapper({
  children,
  repositories,
  collections,
}: {
  children: React.ReactNode;
  repositories: Repository[];
  collections: Collection[];
}) {
  const {
    items,
    addNewFile,
    addNewFolder,
    renameOrMoveItem,
    deleteItem,
    openFile,
  } = useEditor();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      id='editor-layout-wrapper'
      className='flex h-full flex-row content-stretch items-stretch overflow-hidden'
    >
      <div
        className={`absolute z-10 h-full w-full overflow-y-scroll border-r bg-background dark:border-r-gray-800 ${
          !sidebarOpen ? 'max-w-10' : 'max-w-72'
        } lg:static lg:min-w-72 lg:max-w-72`}
      >
        <button
          id='editor-sidebar-toggle-mobile'
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute z-20 w-10 bg-gray-100 px-1 py-1 text-center text-foreground opacity-60 transition-all hover:opacity-100 focus:outline-none lg:hidden dark:bg-gray-800 ${sidebarOpen ? 'right-0' : ''}`}
          aria-label='Toggle editor sidebar'
        >
          {sidebarOpen ? (
            <IoChevronBack size={24} />
          ) : (
            <IoChevronForward size={24} />
          )}
        </button>
        <div
          id='editor-sidebar'
          className={`flex h-full max-h-full w-full flex-col gap-4 transition-all lg:visible lg:ml-0 ${!sidebarOpen ? 'invisible -ml-72' : 'visible ml-0'}`}
        >
          <FileNavigator
            addNewFile={() => {
              addNewFile();
            }}
            addNewFolder={() => {
              addNewFolder();
            }}
            onRename={(item) => {
              renameOrMoveItem(item);
            }}
            onMove={(item) => {
              renameOrMoveItem(item);
            }}
            onOpenFile={(file) => {
              openFile(file);
            }}
            onDelete={(item) => {
              deleteItem(item);
            }}
            items={items}
          />
          <CollectionReferenceList
            repositories={repositories}
            collections={collections}
          />
        </div>
      </div>
      <div className='ml-10 flex-1 flex-shrink overflow-hidden lg:ml-0'>
        <div
          className='flex h-full w-full flex-col bg-background'
          id='editor-page-content'
        >
          <QueryProvider>{children}</QueryProvider>
        </div>
      </div>
    </div>
  );
}
