'use client';

import React, { useCallback, useState } from 'react';

import { CiMenuKebab } from 'react-icons/ci';
import { FaTimes } from 'react-icons/fa';
import {
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiFolder,
} from 'react-icons/fi';

import Button from '@/components/ui/button';

import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * File navigator component
 *
 * @remarks
 *
 * This component is used to display a file navigator in the console.
 * It displays a list of files and folders in a tree structure.
 *
 * It includes a context menu to open, delete, and rename files.
 *
 * The file navigator is used to browse and manage files in the console.
 */
const FileNavigator = () => {
  const { dict } = useLocale();
  const {
    items,
    addNewFile,
    addNewFolder,
    renameOrMoveItem,
    deleteItem,
    openFile,
  } = useEditor();

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    top: number;
    item: FileNavigatorItem;
  } | null>(null);

  const toggleFolder = useCallback((item: FileNavigatorItem) => {
    if (item.current?.name) {
      setOpenFolders((prev) => ({
        ...prev,
        [item.current?.name ?? '']: !prev[item.current?.name ?? ''],
      }));
    }
  }, []);

  /**
   * Handle right click on a folder or file in the file navigator
   * Handle click on the context menu button
   *
   * @remarks
   *
   * This function will prevent the default event of the click
   * and open the context menu at the position of the click
   *
   * @param event - The right click event, or the click event on the context menu button
   * @param item - The item clicked in the file navigator
   */
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, item: FileNavigatorItem) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        top: event.clientY - 45,
        item,
      });
    },
    []
  );

  /**
   * Close the context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Handle click on a folder or file in the file navigator
   *
   * Will close the context menu, open the file or expand
   * the folder in the navigator
   *
   * @props item - The item clicked in the file navigator
   */
  const handleItemClick = useCallback(
    (item: FileNavigatorItem) => {
      if (contextMenu) {
        setContextMenu({
          ...contextMenu,
          visible: false,
        });
      }
      if (!item.current) return;
      if (item.current.type === 'file') {
        openFile(item);
      } else {
        toggleFolder(item);
      }
    },
    [contextMenu, openFile, toggleFolder]
  );

  /**
   * Recursive function that will render all items in the file navigator
   * @param items The items to render
   */
  const renderItems = useCallback(
    (items: FileNavigatorItem[]) =>
      items.map((item) => {
        if (!item.current) return;
        return (
          <div key={item.current.name} className='my-1'>
            <div
              className={`flex items-center justify-normal rounded-md p-1 text-sm`}
            >
              {item.current.type === 'folder' ? (
                openFolders[item.current.name] ? (
                  <FiChevronDown
                    className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    aria-label={`Close folder ${item.current.name} in the file navigator`}
                    onClick={() => handleItemClick(item)}
                  />
                ) : (
                  <FiChevronRight
                    className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    aria-label={`Open folder ${item.current.name} in the file navigator`}
                    onClick={() => handleItemClick(item)}
                  />
                )
              ) : null}
              <span className='ml-2'>
                {item.current.type === 'folder' ? <FiFolder /> : <FiFileText />}
              </span>
              <span
                className='ml-2 cursor-pointer hover:underline'
                aria-label={`Open ${item.current.name} ${item.current.type}`}
                onClick={() => handleItemClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                {item.current.name}
              </span>
              <button
                className='ml-auto cursor-pointer rounded-full py-1 hover:bg-gray-100 dark:hover:bg-gray-700'
                aria-label={`Open context menu for ${item.current.name}`}
                onClick={(e) => {
                  handleContextMenu(e, item);
                }}
              >
                <CiMenuKebab />
              </button>
            </div>
            {item.current.type === 'folder' &&
              openFolders[item.current.name] && (
                <div className='pl-6'>
                  {renderItems(
                    (item.current?.children ?? []).map((child) => ({
                      current: child,
                      original: child,
                    }))
                  )}
                </div>
              )}
          </div>
        );
      }),
    [openFolders, handleItemClick, handleContextMenu]
  );

  return (
    <div id='file-navigator' className='relative'>
      <div className='mb-0 flex flex-row justify-stretch gap-0 border-b bg-gray-100 p-0 dark:border-gray-700 dark:bg-gray-800'>
        <Button
          className='w-[40%] rounded-none px-2 py-2 text-xs shadow-none hover:bg-gray-200 lg:w-1/2 lg:text-xs dark:hover:bg-gray-700'
          variant='ghost'
          size='sm'
          onClick={addNewFile}
          icon={<FiFileText size={12} />}
          aria-label='Create a new file'
        >
          {dict.fileNavigator.createFile}
        </Button>
        <Button
          className='w-[40%] rounded-none px-2 py-2 text-xs shadow-none hover:bg-gray-200 lg:w-1/2 lg:text-xs dark:hover:bg-gray-700'
          variant='ghost'
          size='sm'
          onClick={addNewFolder}
          icon={<FiFolder size={12} />}
          aria-label='Create a new folder'
        >
          {dict.fileNavigator.createFolder}
        </Button>
      </div>
      <div className='max-h-60 overflow-auto border-t px-3 py-4 xl:max-h-96 dark:border-gray-700'>
        {renderItems(items)}
      </div>
      {contextMenu && contextMenu.visible && (
        <ul
          id='file-navigator-context-menu'
          className='bg-popover absolute right-2 left-2 rounded-lg border px-4 py-2'
          style={{ top: `${contextMenu.top}px` }}
        >
          <button
            className='float-end cursor-pointer p-1 transition-all hover:opacity-40'
            aria-label='Close context menu'
            onClick={closeContextMenu}
          >
            <FaTimes size={16} />
          </button>
          <li className='border-border border-b p-1 pb-2 text-xs'>
            {contextMenu.item.current?.name ?? contextMenu.item.original?.name}
          </li>
          {contextMenu.item?.current?.type === 'file' && (
            <>
              <li
                className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
                onClick={() => {
                  if (contextMenu.item.current?.type === 'file') {
                    closeContextMenu();
                    openFile(contextMenu.item);
                  }
                }}
              >
                {dict.fileNavigator.open}
              </li>
            </>
          )}
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => {
              closeContextMenu();
              renameOrMoveItem(contextMenu.item);
            }}
          >
            {dict.fileNavigator.move}
          </li>
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => {
              closeContextMenu();
              renameOrMoveItem(contextMenu.item);
            }}
          >
            {dict.fileNavigator.rename}
          </li>
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => {
              closeContextMenu();
              deleteItem(contextMenu.item);
            }}
          >
            {dict.list.delete}
          </li>
        </ul>
      )}
    </div>
  );
};

export default FileNavigator;
