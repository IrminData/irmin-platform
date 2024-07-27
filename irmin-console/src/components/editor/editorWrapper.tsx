'use client';

import React, { useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import FileNavigator from '@/components/editor/fileNavigator';
import AddNewItemModalContent from '@/components/editor/modals/AddNewItemModalContent';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Dataset } from '@/types/api/Dataset';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import RenameOrMoveItemModalContent from './modals/RenameOrMoveItemModalContent';

/**
 * Component to wrap the editor pages in.
 * Provides a sidebar with file navigator and other tools.
 *
 * @param children - The children to render
 * @returns The editor wrapper
 */
export default function EditorWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { irminModal, irminConfirm } = usePopup();
  const { dict } = useLocale();
  const { datasets } = useWorkspace();
  const {
    bucket,
    items,
    updateFileContents,
    createFile,
    createFolder,
    updateFile,
    updateFolder,
    deleteFile,
    deleteFolder,
    openFileTabs,
    setOpenFileTabs,
    activeTab,
    setActiveTab,
  } = useBucket();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * When a dataset table is selected, format the table name
   * and insert it into the editor.
   */
  const selectDatasetTable = (dataset: Dataset, table: string) => {
    // Get the current tab and the file it represents
    const currentTabSlug = openFileTabs[activeTab];
    const currentTab = bucket?.files.find(
      (file) => file.path === currentTabSlug
    );
    if (!currentTab) return;
    // Format the table name
    const formattedTable = ` $[${dataset.slug}.${table}.0]`;
    // Insert the table name into the current tab contents
    const newContents = currentTab.contents + formattedTable;
    // Update the file with the new contents in the bucket and the item list
    updateFileContents({
      ...currentTab,
      contents: newContents,
    });
  };

  /**
   * Open the modal to add a new file or folder.
   *
   * The modal will ask for what to create and where to create it.
   */
  const addNewItem = () =>
    irminModal.show(
      dict.fileNavigator.createNewFileOrFolder,
      <AddNewItemModalContent
        bucket={bucket}
        createFile={createFile}
        createFolder={createFolder}
      />
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
      <RenameOrMoveItemModalContent
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
    <div className='flex'>
      <div
        className={`inline-block overflow-y-scroll bg-gray-50 ${
          !sidebarOpen ? 'w-10' : 'absolute z-10 w-96'
        } xl:w-96`}
        style={{
          height: 'calc(100vh - 55px)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className='block px-1 py-1 text-xl focus:outline-none xl:hidden'
        >
          {sidebarOpen ? (
            <IoChevronBack className='mr-2 inline-block w-full' />
          ) : (
            <IoChevronForward className='mr-2 inline-block w-full' />
          )}
        </button>
        <div
          className={`${!sidebarOpen ? 'hidden' : 'block w-96'} py-8 xl:block`}
        >
          <FileNavigator
            addNewItem={() => {
              addNewItem();
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
          <br />
          <div className='max-h-80 overflow-auto border-t p-2'>
            <p className='px-4 text-sm font-bold'>
              {dict.portalNavigation.links.datasets}
            </p>
            <ul>
              {datasets.datasets.map((dataset) => (
                <li key={dataset.id} className='px-4 py-2 text-xs'>
                  {dataset.name}
                  <ul>
                    {dataset.tables.map((table, i) => (
                      <li
                        key={`datset-${dataset.id}-table-${i}`}
                        className='cursor-pointer px-4 pt-2 transition-colors hover:text-irmin_green'
                        onClick={() => selectDatasetTable(dataset, table)}
                      >
                        {table}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className='inline-block w-full overflow-auto bg-white'>
        {children}
      </div>
    </div>
  );
}
