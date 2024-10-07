'use client';

import { useCallback, useMemo, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiChevronDown, FiChevronRight, FiFolder } from 'react-icons/fi';

import { useLocale } from '@/context/LocaleContext';

import { transformBucketToFileNavItem } from '@/utils/bucket';

import { Bucket } from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Path selector component
 *
 * @remarks
 *
 * This component is used by file navigator modals to allow the user to select a path.
 * It allows the user to browse the directory structure and select a path.
 * It will only show folder items that are not the item being edited.
 *
 * @param pathSelectorProps - The props for the path selector
 * @param pathSelectorProps.bucket - The bucket get the list of files to show
 * @param pathSelectorProps.itemName - The name of the item being edited. For files, should include the extension
 * @param pathSelectorProps.originalItemPath - The original path of the item being edited
 * @param pathSelectorProps.currentSelected - The currently selected path, if any
 * @param pathSelectorProps.onSelectPath - Function to select a path
 */
const PathSelector = ({
  bucket,
  itemName,
  originalItemPath,
  currentSelected,
  onSelectPath,
}: {
  bucket: Bucket | null;
  itemName: string | null;
  originalItemPath: string | null;
  currentSelected: string | null;
  onSelectPath: (path: string) => void;
}) => {
  const { dict } = useLocale();

  // State for the open folders in the file navigator
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  // Set the currently selected path, but remove the item name from it
  const [selectedPath, setSelectedPath] = useState<string>(
    (currentSelected ?? '').replace(new RegExp(`/${itemName}$`), '')
  );

  // Transform the bucket into a file navigator item
  const items = useMemo(
    () => (bucket ? transformBucketToFileNavItem(bucket) : []),
    [bucket]
  );

  /**
   * Toggle a folder in the file navigator
   *
   * Will open or close the folder in the navigator
   *
   * @param item - The item to toggle
   */
  const toggleFolder = useCallback((item: FileNavigatorItem) => {
    if (item.current?.name) {
      setOpenFolders((prev) => ({
        ...prev,
        [item.current?.name ?? '']: !prev[item.current?.name ?? ''],
      }));
    }
  }, []);

  /**
   * Handle click on a folder or file in the file navigator
   *
   * Will open the folder in the navigator or set the selected path
   *
   * @param item - The item clicked in the file navigator, empty if root
   */
  const handleItemClick = useCallback(
    (item?: FileNavigatorItem) => {
      // Handle root click
      if (!item) {
        setSelectedPath('');
        const newPath = itemName ? `/${itemName}` : '/';
        onSelectPath(newPath);
        return;
      }
      // Handle folder click
      if (!item.current) return;
      if (item.type === 'folder') {
        toggleFolder(item);
      }
      setSelectedPath(item.current.path);
      // Update the parent component with the new path
      const newPath = item.current.path + (itemName ? `/${itemName}` : '');
      onSelectPath(newPath);
    },
    [itemName, onSelectPath, toggleFolder]
  );

  /**
   * Recursive function that will render all items in the file navigator
   * @param items The items to render
   */
  const renderItems = useCallback(
    (items: FileNavigatorItem[]) =>
      items.map((item) => {
        if (
          !item.current ||
          item.type !== 'folder' ||
          item.current.path === originalItemPath ||
          item.original?.path === originalItemPath
        )
          return;
        return (
          <div key={item.current.path} className='my-1'>
            <div
              className={`flex items-center justify-normal rounded-md p-1 text-sm ${item.current.path === selectedPath ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {openFolders[item.current.name] ? (
                <FiChevronDown
                  className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  aria-label={`Close folder ${item.current.name} in the file navigator`}
                />
              ) : (
                <FiChevronRight
                  className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  aria-label={`Open folder ${item.current.name} in the file navigator`}
                />
              )}
              <span className='ml-2'>
                <FiFolder />
              </span>
              <span
                className='ml-2 cursor-pointer hover:underline'
                aria-label={`Open ${item.current.name} ${item.type}`}
              >
                {item.current.name}
              </span>
            </div>
            {openFolders[item.current.name] && (
              <div className='pl-6'>{renderItems(item.children ?? [])}</div>
            )}
          </div>
        );
      }),
    [selectedPath, originalItemPath, openFolders, handleItemClick]
  );

  // Check if the root is selected
  const rootSelected = useMemo(
    () => selectedPath === '' || selectedPath === '/' || selectedPath === null,
    [selectedPath]
  );

  return (
    <div
      id='path-selector'
      className='relative mb-2 max-h-36 overflow-y-scroll border-b pb-4 dark:border-b-gray-800'
    >
      <div className='my-1'>
        <button
          className={`flex items-center justify-normal rounded-md p-1 text-sm ${rootSelected ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
          onClick={() => handleItemClick()}
        >
          <span className='ml-2'>
            <FaFolderTree />
          </span>
          <span className='ml-2 cursor-pointer hover:underline'>
            {dict.fileNavigator.bucketRoot}
          </span>
        </button>
        {renderItems(items)}
      </div>
    </div>
  );
};

export default PathSelector;
