'use client';

import React, { useState } from 'react';

import { CiMenuKebab } from 'react-icons/ci';
import { FaTimes } from 'react-icons/fa';
import {
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiFolder,
  FiPlus,
} from 'react-icons/fi';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

import {
  FileNavigatorFileItem,
  FileNavigatorItem,
} from '@/types/internal/FileNavigatorItem';

/**
 * File navigator component
 *
 * @remarks
 *
 * This component is used to display a file navigator in the portal.
 * It displays a list of files and folders in a tree structure.
 *
 * It includes a context menu to open, delete, and rename files.
 *
 * The file navigator is used to browse and manage files in the portal.
 */
const FileNavigator: React.FC<{
  items: FileNavigatorItem[];
  addNewItem: () => void;
  onOpenFile: (_item: FileNavigatorFileItem) => void;
  onDelete: (_item: FileNavigatorItem) => void;
  onRename: (_item: FileNavigatorItem) => void;
  onMove: (_item: FileNavigatorItem) => void;
}> = ({ items, addNewItem, onOpenFile, onDelete, onRename, onMove }) => {
  const { dict } = useLocale();

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    top: number;
    item: FileNavigatorItem;
  } | null>(null);

  const toggleFolder = (item: FileNavigatorItem) => {
    if (item.current?.name) {
      setOpenFolders((prev) => ({
        ...prev,
        [item.current?.name ?? '']: !prev[item.current?.name ?? ''],
      }));
    }
  };

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
  const handleContextMenu = (
    event: React.MouseEvent,
    item: FileNavigatorItem
  ) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      top: event.clientY - 75,
      item,
    });
  };

  /**
   * Close the context menu
   */
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  /**
   * Handle click on a folder or file in the file navigator
   *
   * Will close the context menu, open the file or expand
   * the folder in the navigator
   *
   * @props item - The item clicked in the file navigator
   */
  const handleItemClick = (item: FileNavigatorItem) => {
    if (contextMenu) {
      setContextMenu({
        ...contextMenu,
        visible: false,
      });
    }
    if (!item.current) return;
    if (item.type === 'file') {
      onOpenFile(item);
    } else {
      toggleFolder(item);
    }
  };

  /**
   * Recursive function that will render all items in the file navigator
   * @param items The items to render
   * @returns The rendered items
   */
  const renderItems = (items: FileNavigatorItem[]) =>
    items.map((item) => {
      if (!item.current) return;
      return (
        <div key={item.current.name} className='my-1'>
          <div
            className={`flex items-center justify-normal rounded-md p-1 text-sm`}
          >
            {item.type === 'folder' ? (
              openFolders[item.current.name] ? (
                <FiChevronDown
                  className='inline-block cursor-pointer hover:bg-gray-100'
                  aria-label={`Close folder ${item.current.name} in the file navigator`}
                  onClick={() => handleItemClick(item)}
                />
              ) : (
                <FiChevronRight
                  className='inline-block cursor-pointer hover:bg-gray-100'
                  aria-label={`Open folder ${item.current.name} in the file navigator`}
                  onClick={() => handleItemClick(item)}
                />
              )
            ) : null}
            <span className='ml-2'>
              {item.type === 'folder' ? <FiFolder /> : <FiFileText />}
            </span>
            <span
              className='ml-2 cursor-pointer hover:underline'
              aria-label={`Open ${item.current.name} ${item.type}`}
              onClick={() => handleItemClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {item.current.name}
            </span>
            <button
              className='ml-auto cursor-pointer hover:bg-gray-100'
              aria-label={`Open context menu for ${item.current.name}`}
              onClick={(e) => {
                handleContextMenu(e, item);
              }}
            >
              <CiMenuKebab />
            </button>
          </div>
          {item.type === 'folder' && openFolders[item.current.name] && (
            <div className='pl-6'>{renderItems(item.children ?? [])}</div>
          )}
        </div>
      );
    });

  return (
    <div id='file-navigator' className='relative'>
      <div className='px-3'>
        <Button
          className='mb-2 w-full text-base font-normal hover:no-underline hover:opacity-40'
          variant='link'
          colorScheme='secondary'
          size='sm'
          onClick={addNewItem}
          icon={
            <FiPlus size={24} className='mr-2 inline-block text-irmin_blue' />
          }
        >
          {dict.fileNavigator.createNewFileOrFolder}
        </Button>
      </div>
      <div className='fileNavigator px-3'>{renderItems(items)}</div>
      {contextMenu && contextMenu.visible && (
        <ul
          id='file-navigator-context-menu'
          className='absolute left-2 right-2 rounded-lg bg-white px-4 py-2 shadow'
          style={{ top: `${contextMenu.top}px` }}
        >
          <button
            className='float-end cursor-pointer p-1 transition-all hover:opacity-40'
            aria-label='Close context menu'
            onClick={closeContextMenu}
          >
            <FaTimes size={16} />
          </button>
          <li className='p-1 pb-2 text-sm font-semibold'>
            {contextMenu.item.current?.name ?? contextMenu.item.original?.name}
          </li>
          {contextMenu.item.type === 'file' && (
            <>
              <li
                className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100'
                onClick={() => {
                  if (contextMenu.item.type === 'file') {
                    closeContextMenu();
                    onOpenFile(contextMenu.item);
                  }
                }}
              >
                {dict.fileNavigator.open}
              </li>
            </>
          )}
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100'
            onClick={() => {
              closeContextMenu();
              onMove(contextMenu.item);
            }}
          >
            {dict.fileNavigator.move}
          </li>
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100'
            onClick={() => {
              closeContextMenu();
              onRename(contextMenu.item);
            }}
          >
            {dict.fileNavigator.rename}
          </li>
          <li
            className='cursor-pointer rounded p-1 text-sm hover:bg-gray-100'
            onClick={() => {
              closeContextMenu();
              onDelete(contextMenu.item);
            }}
          >
            {dict.fileNavigator.delete}
          </li>
        </ul>
      )}
    </div>
  );
};

export default FileNavigator;
