'use client';

import { useCallback, useMemo, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiChevronDown, FiChevronRight, FiFolder } from 'react-icons/fi';

import { useLocale } from '@/context/LocaleContext';

import { EditorItem } from '@/types/core/EditorItems';

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
 * @param pathSelectorProps.editorItems - The list of editor items to display in the file navigator
 * @param pathSelectorProps.itemName - The name of the item being edited. For files, should include the extension
 * @param pathSelectorProps.originalItemPath - The original path of the item being edited
 * @param pathSelectorProps.currentSelected - The currently selected path, if any
 * @param pathSelectorProps.onSelectPath - Function to select a path
 */
const PathSelector = ({
  editorItems,
  itemName,
  originalItemPath,
  currentSelected,
  onSelectPath,
}: {
  editorItems: EditorItem[];
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

  /**
   * Toggle a folder in the file navigator
   *
   * Will open or close the folder in the navigator
   *
   * @param item - The item to toggle
   */
  const toggleFolder = useCallback((item: EditorItem) => {
    if (item.name) {
      setOpenFolders((prev) => ({
        ...prev,
        [item.name ?? '']: !prev[item.name ?? ''],
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
    (item?: EditorItem) => {
      // Handle root click
      if (!item) {
        setSelectedPath('');
        const newPath = itemName ? `/${itemName}` : '/';
        onSelectPath(newPath);
        return;
      }
      // Handle folder click
      if (!item) return;
      if (item.type === 'folder') {
        toggleFolder(item);
      }
      setSelectedPath(item.path);
      // Update the parent component with the new path
      const newPath = item.path + (itemName ? `/${itemName}` : '');
      onSelectPath(newPath);
    },
    [itemName, onSelectPath, toggleFolder]
  );

  /**
   * Recursive function that will render all items in the file navigator
   * @param items The items to render
   */
  const renderItems = useCallback(
    (items: EditorItem[]) =>
      items.map((item) => {
        if (item.type !== 'folder' || item.path === originalItemPath) return;
        return (
          <div key={item.path} className='my-1'>
            <div
              className={`flex items-center justify-normal rounded-md p-1 text-sm ${item.path === selectedPath ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {openFolders[item.name] ? (
                <FiChevronDown
                  className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  aria-label={`Close folder ${item.name} in the file navigator`}
                />
              ) : (
                <FiChevronRight
                  className='inline-block cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  aria-label={`Open folder ${item.name} in the file navigator`}
                />
              )}
              <span className='ml-2'>
                <FiFolder />
              </span>
              <span
                className='ml-2 cursor-pointer hover:underline'
                aria-label={`Open ${item.name}`}
              >
                {item.name}
              </span>
            </div>
            {openFolders[item.name] && (
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
      className='relative mb-2 max-h-48 overflow-y-scroll border-b pb-4 dark:border-b-gray-800'
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
            {dict.fileNavigator.rootDirectory}
          </span>
        </button>
        {renderItems(editorItems)}
      </div>
    </div>
  );
};

export default PathSelector;
