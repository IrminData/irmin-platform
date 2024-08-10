'use client';

import React, { useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import AddNewFileModal from '@/components/bucket/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/bucket/modals/AddNewFolderModal';
import RenameOrMoveItemModal from '@/components/bucket/modals/RenameOrMoveItemModal';
import FileNavigator from '@/components/bucket/navigator/FileNavigator';
import RepositoryTableReferenceList from '@/components/repository/RepositoryTableReferenceList';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

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
  const addNewFile = () =>
    irminModal.show(
      dict.fileNavigator.createFile,
      <AddNewFileModal bucket={bucket} createFile={createFile} />
    );

  /**
   * Open the modal to create a new folder
   */
  const addNewFolder = () =>
    irminModal.show(
      dict.fileNavigator.createFolder,
      <AddNewFolderModal bucket={bucket} createFolder={createFolder} />
    );

  /**
   * Open the modal to rename or move a file or folder.
   *
   * The modal will ask for the new name, path, and, if applicable, type of the file.
   *
   * @param item The item to change
   */
  const renameOrMoveItem = (item: FileNavigatorItem) => {
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
  };

  /**
   * Delete a file or folder.
   *
   * Ask for confirmation before deleting.
   *
   * @param item The item to delete
   */
  const deleteItem = (item: FileNavigatorItem) => {
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
  };

  return (
    <div
      id='editor-layout-wrapper'
      className='flex h-full flex-row content-stretch items-stretch overflow-hidden'
    >
      <div
        className={`absolute z-10 h-[calc(100vh-55px)] overflow-y-scroll border-r bg-gray-50 ${
          !sidebarOpen ? 'max-w-10' : 'max-w-72'
        } w-full lg:relative lg:max-w-72`}
      >
        <button
          id='editor-sidebar-toggle-mobile'
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute z-20 bg-gray-100 px-1 py-1 text-irmin_black opacity-60 transition-all hover:opacity-100 focus:outline-none lg:hidden ${!sidebarOpen ? 'text-center' : 'right-0 w-8'}`}
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
          className={`h-full max-h-[calc(100vh-56px)] w-full transition-all lg:visible lg:ml-0 ${!sidebarOpen ? 'invisible -ml-72' : 'visible ml-0'}`}
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
          <RepositoryTableReferenceList />
        </div>
      </div>
      <div
        className='ml-10 flex flex-1 flex-col bg-white lg:ml-0'
        id='editor-page-content'
      >
        {children}
      </div>
    </div>
  );
}
