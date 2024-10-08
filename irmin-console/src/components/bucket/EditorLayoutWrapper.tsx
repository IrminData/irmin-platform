'use client';

import React, { useCallback, useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import CollectionReferenceList from '@/components/repository/collections/CollectionReferenceList';

import { useBucket } from '@/context/BucketContext';
import { EditorContextProvider } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { QueryProvider } from '@/context/QueryContext';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import FileNavigator from './FileNavigator';
import AddNewFileModal from './modals/AddNewFileModal';
import AddNewFolderModal from './modals/AddNewFolderModal';
import RenameOrMoveItemModal from './modals/RenameOrMoveItemModal';

/**
 * Component to wrap the editor pages in.
 * Provides a sidebar with file navigator and other tools.
 *
 * @param children - The children to render
 */
export default function EditorLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { irminModal, irminConfirm } = usePopup();
  const { dict } = useLocale();
  const {
    bucket,
    items,
    createFile,
    createFolder,
    updateFile,
    updateFolder,
    deleteFile,
    deleteFolder,
    openFileTabs,
    setOpenFileTabs,
    setActiveTab,
  } = useBucket();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Open the modal to create a new file
   */
  const addNewFile = useCallback(() => {
    irminModal.show(
      dict.fileNavigator.createFile,
      <AddNewFileModal bucket={bucket} createFile={createFile} />
    );
  }, [irminModal, dict, bucket, createFile]);

  /**
   * Open the modal to create a new folder
   */
  const addNewFolder = useCallback(() => {
    irminModal.show(
      dict.fileNavigator.createFolder,
      <AddNewFolderModal bucket={bucket} createFolder={createFolder} />
    );
  }, [irminModal, dict, bucket, createFolder]);

  /**
   * Open the modal to rename or move a file or folder.
   *
   * The modal will ask for the new name, path, and, if applicable, type of the file.
   *
   * @param item The item to change
   */
  const renameOrMoveItem = useCallback(
    (item: FileNavigatorItem) => {
      irminModal.show(
        item.type === 'file'
          ? dict.fileNavigator.updateFile
          : dict.fileNavigator.updateFolder,
        <RenameOrMoveItemModal
          item={item}
          bucket={bucket}
          updateFile={updateFile}
          updateFolder={updateFolder}
        />
      );
    },
    [irminModal, dict, bucket, updateFile, updateFolder]
  );

  /**
   * Delete a file or folder.
   *
   * Ask for confirmation before deleting.
   *
   * @param item The item to delete
   */
  const deleteItem = useCallback(
    (item: FileNavigatorItem) => {
      if (item.type == 'file') {
        irminConfirm(
          'warning',
          `${dict.fileNavigator.deleteConfirmation} ${item.current?.name ?? 'this file'}?`,
          (confirmed) => {
            if (confirmed) {
              deleteFile(item);
            }
          }
        );
      }
      if (item.type === 'folder') {
        irminConfirm(
          'warning',
          `${dict.fileNavigator.deleteConfirmation} ${item.current?.name ?? 'this file'}? ${dict.fileNavigator.deleteFolderWarning}.`,
          (confirmed) => {
            if (confirmed) {
              deleteFolder(item);
            }
          }
        );
      }
    },
    [irminConfirm, dict, deleteFile, deleteFolder]
  );

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
          className={`absolute z-20 w-10 bg-gray-100 px-1 py-1 text-center text-foreground opacity-60 transition-all hover:opacity-100 focus:outline-none dark:bg-gray-800 lg:hidden ${sidebarOpen ? 'right-0' : ''}`}
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
              if (!openFileTabs.includes(file.current?.path ?? '')) {
                const newTabs = [...openFileTabs, file.current?.path ?? ''];
                setOpenFileTabs(newTabs);
                setActiveTab(newTabs.length - 1);
              } else {
                setActiveTab(openFileTabs.indexOf(file.current?.path ?? ''));
              }
            }}
            onDelete={(item) => {
              deleteItem(item);
            }}
            items={items}
          />
          <CollectionReferenceList />
        </div>
      </div>
      <div className='ml-10 flex-1 flex-shrink overflow-hidden lg:ml-0'>
        <div
          className='flex h-full w-full flex-col bg-background'
          id='editor-page-content'
        >
          <EditorContextProvider>
            <QueryProvider>{children}</QueryProvider>
          </EditorContextProvider>
        </div>
      </div>
    </div>
  );
}
