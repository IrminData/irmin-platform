'use client';

import React, { useState } from 'react';

import {
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiFolder,
  FiPlus,
} from 'react-icons/fi';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * File navigator item properties
 * @internal
 */
type FileItemProps = {
  name: string;
  type: 'file' | 'folder';
  children?: FileItemProps[];
};

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
  items: FileItemProps[];
  onOpenFile: (_name: string) => void; // Callback function when a file is opened
  onDeleteFile?: (_name: string) => void; // Callback function when a file is deleted
  onRenameFile?: (_name: string) => void; // Callback function when a file is renamed
}> = ({ items, onOpenFile, onDeleteFile, onRenameFile }) => {
  const { dict } = useLocale();

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    itemName: string;
  }>({ visible: false, x: 0, y: 0, itemName: '' });

  const toggleFolder = (name: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleContextMenu = (event: React.MouseEvent, name: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      itemName: name,
    });
  };

  const handleClick = (event: React.MouseEvent, item: FileItemProps) => {
    setContextMenu((prev) => ({
      ...prev,
      visible: false,
    }));
    if (item.type === 'file') {
      onOpenFile(item.name);
    } else {
      toggleFolder(item.name);
    }
  };

  // Close context menu on click outside
  const handleClickOutside = () => {
    setContextMenu((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const renderItems = (items: FileItemProps[]) => {
    return items.map((item) => (
      <div
        key={item.name}
        className='my-1'
        onContextMenu={(e) => handleContextMenu(e, item.name)}
      >
        <div
          className={`flex cursor-pointer items-center rounded-md p-1 hover:bg-gray-100`}
          onClick={(e) => handleClick(e, item)}
        >
          {item.type === 'folder' ? (
            openFolders[item.name] ? (
              <FiChevronDown className='inline-block' />
            ) : (
              <FiChevronRight className='inline-block' />
            )
          ) : null}
          <span className='ml-2'>
            {item.type === 'folder' ? <FiFolder /> : <FiFileText />}
          </span>
          <span className='ml-2'>{item.name}</span>
        </div>
        {item.type === 'folder' && openFolders[item.name] && (
          <div className='pl-6'>{renderItems(item.children ?? [])}</div>
        )}
      </div>
    ));
  };

  return (
    <>
      <div className='px-3'>
        <Button
          className='mb-2'
          variant='link'
          colorScheme='primary'
          size='sm'
          icon={<FiPlus className='-mt-1 mr-2 inline-block text-irmin_green' />}
        >
          {dict.fileNavigator.createNewFileOrFolder}
        </Button>
      </div>
      <div className='fileNavigator px-3' onClick={handleClickOutside}>
        {renderItems(items)}
      </div>
      {contextMenu.visible && (
        <ul
          className='absolute rounded bg-white p-2 shadow'
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <li
            className='cursor-pointer p-1 hover:bg-gray-100'
            onClick={() => onOpenFile(contextMenu.itemName)}
          >
            {dict.fileNavigator.open}
          </li>
          <li
            className='cursor-pointer p-1 hover:bg-gray-100'
            onClick={() => onDeleteFile && onDeleteFile(contextMenu.itemName)}
          >
            {dict.fileNavigator.delete}
          </li>
          <li
            className='cursor-pointer p-1 hover:bg-gray-100'
            onClick={() => onRenameFile && onRenameFile(contextMenu.itemName)}
          >
            {dict.fileNavigator.rename}
          </li>
        </ul>
      )}
    </>
  );
};

export default FileNavigator;
