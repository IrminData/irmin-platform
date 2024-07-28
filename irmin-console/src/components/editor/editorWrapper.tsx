'use client';

import React, { useState } from 'react';

import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import FileNavigator from '@/components/editor/fileNavigator';
import AddNewFileModal from '@/components/editor/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/editor/modals/AddNewFolderModal';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Dataset } from '@/types/api/Dataset';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import RenameOrMoveItemModal from './modals/RenameOrMoveItemModal';

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
  const { irminModal, irminConfirm, irminAlert } = usePopup();
  const { dict } = useLocale();
  const { datasets } = useWorkspace();
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
   * When a dataset table is selected, format the table name
   * and insert it into the editor.
   */
  const selectDatasetTable = (dataset: Dataset, table: string) => {
    // Format the table name
    const formattedTable = ` $[${dataset.slug}.${table}.0]`;
    // Alert the table name to the user
    irminAlert(
      'info',
      <div>
        <p className='m-0 text-xs font-light text-irmin_black'>
          {dict.editor.referenceDataSet.toReferenceTheTable}{' '}
          <span className='font-medium text-irmin_blue'>{table}</span>{' '}
          {dict.editor.referenceDataSet.fromTheDataset}{' '}
          <span className='font-medium text-irmin_blue'>{dataset.name}</span>{' '}
          {dict.editor.referenceDataSet.inTheEditor}
        </p>
        <p className='my-2 text-sm font-normal text-irmin_blue'>
          {formattedTable}
        </p>
      </div>
    );
  };

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
    <div className='flex'>
      <div
        className={`absolute z-10 overflow-y-scroll border-r bg-gray-50 ${
          !sidebarOpen ? 'max-w-10' : 'max-w-72'
        } w-full lg:relative lg:max-w-72`}
        style={{
          height: 'calc(100vh - 55px)',
        }}
      >
        <button
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
          className={`${!sidebarOpen ? 'invisible -ml-72' : 'visible ml-0'} h-full w-full transition-all lg:visible lg:ml-0`}
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
          <div className='max-h-80 overflow-auto border-t p-2'>
            <p className='px-4 pb-2 text-sm'>
              {dict.portalNavigation.links.datasets}
            </p>
            <p className='px-4 text-xs text-gray-400'>
              {dict.editor.referenceDataSet.clickOnATable}
            </p>
            <ul className='text-xs'>
              {datasets.datasets.map((dataset) => (
                <li key={`dataset-${dataset.id}`} className='px-4 py-2'>
                  <p className='border-t pt-2 font-normal'>{dataset.name}</p>
                  <ul className='mb-4 list-item pb-4 font-light'>
                    {dataset.tables.map((table, i) => (
                      <li
                        key={`dataset-${dataset.id}-table-${i}`}
                        className='cursor-pointer px-4 pt-2 transition-colors hover:text-irmin_green'
                        onClick={() => selectDatasetTable(dataset, table)}
                        aria-label={`Click to get the reference snippet for the table ${table} from ${dataset.name}`}
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
      <div className='ml-10 inline-block w-full overflow-auto lg:ml-0'>
        {children}
      </div>
    </div>
  );
}
