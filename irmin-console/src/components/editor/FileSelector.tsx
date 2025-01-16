'use client';

import { useCallback, useMemo, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import {
  FiChevronDown,
  FiChevronRight,
  FiFile,
  FiFolder,
} from 'react-icons/fi';

import { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { transformEditorItemsToFileNavItem } from '@/utils/editorItems';

import { EditorItems } from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * File selector component
 *
 * @remarks
 *
 * This component allows the user to browse the directory structure and select a file.
 * It will show both folders and files in a hierarchical view.
 * Clicking a folder toggles its expansion.
 * Clicking a file selects that file.
 *
 * @param fileSelectorProps - The props for the file selector
 * @param fileSelectorProps.editorItems - The editorItems, providing the list of files and folders to show
 * @param fileSelectorProps.currentSelectedFile - The currently selected file path, if any
 * @param fileSelectorProps.onSelectFile - Function to call when a file is selected
 */
const FileSelector = ({
  editorItems,
  currentSelectedFile,
  onSelectFile,
}: {
  editorItems: EditorItems | null;
  currentSelectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}) => {
  const { dict } = useLocale();

  // State for the open folders in the file navigator
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  // Keep track of the currently selected file
  const [selectedFile, setSelectedFile] = useState<string>(
    currentSelectedFile ?? ''
  );

  // Transform the editorItems into a file navigator item
  const items = useMemo(
    () => (editorItems ? transformEditorItemsToFileNavItem(editorItems) : []),
    [editorItems]
  );

  /**
   * Toggle a folder in the file navigator
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
   * Handle clicking an item (folder or file) in the file navigator
   *
   * @param item - The clicked item
   */
  const handleItemClick = useCallback(
    (item: FileNavigatorItem) => {
      if (!item.current) return;
      if (item.type === 'folder') {
        // Toggle folder open/close
        toggleFolder(item);
      } else if (item.type === 'file') {
        // Select file
        setSelectedFile(item.current.path);
        onSelectFile(item.current.path);
      }
    },
    [onSelectFile, toggleFolder]
  );

  /**
   * Render folder items (including any nested items) recursively,
   * along with any files inside them.
   *
   * @param itemsToRender The items to render (folders or files)
   */
  const renderItems = useCallback(
    (itemsToRender: FileNavigatorItem[]) =>
      itemsToRender.map((item) => {
        if (!item.current) return null;

        // Render folder
        if (item.type === 'folder') {
          return (
            <div key={item.current.path} className='my-1'>
              <div
                className='flex cursor-pointer items-center justify-normal rounded-md p-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-800'
                onClick={() => handleItemClick(item)}
              >
                {openFolders[item.current.name] ? (
                  <FiChevronDown
                    className='inline-block'
                    aria-label={`Close folder ${item.current.name} in the file navigator`}
                  />
                ) : (
                  <FiChevronRight
                    className='inline-block'
                    aria-label={`Open folder ${item.current.name} in the file navigator`}
                  />
                )}
                <span className='ml-2'>
                  <FiFolder />
                </span>
                <span
                  className='ml-2 hover:underline'
                  aria-label={`Open ${item.current.name} folder`}
                >
                  {item.current.name}
                </span>
              </div>
              {openFolders[item.current.name] && (
                <div className='pl-6'>{renderItems(item.children ?? [])}</div>
              )}
            </div>
          );
        }

        // Render file
        if (item.type === 'file') {
          const isSelected = item.current.path === selectedFile;
          return (
            <div
              key={item.current.path}
              className={`my-1 ml-6 flex cursor-pointer items-center justify-normal rounded-md p-1 text-sm ${
                isSelected
                  ? 'bg-gray-200 dark:bg-gray-800'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleItemClick(item)}
            >
              <span className='ml-2'>
                <FiFile />
              </span>
              <span
                className='ml-2 hover:underline'
                aria-label={`Select file ${item.current.name}`}
              >
                {item.current.name}
              </span>
            </div>
          );
        }

        return null;
      }),
    [selectedFile, openFolders, handleItemClick]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <div
      id='file-selector'
      className='relative mb-2 max-h-48 overflow-y-scroll border-b pb-4 dark:border-b-gray-800'
    >
      {currentSelectedFile && currentSelectedFile.length > 0 && (
        <ButtonWithTooltip
          href={`${workspaceUrl}/editor?path=${currentSelectedFile}`}
          target='_blank'
          variant='gray'
          tooltip={currentSelectedFile}
          className='w-full'
        >
          {dict.workflow.openInEditor}
        </ButtonWithTooltip>
      )}
      <div className='my-1'>
        {/* Root directory display - optional if you want a root entry */}
        <div className='flex items-center justify-normal rounded-md p-1 text-sm'>
          <span className='ml-2'>
            <FaFolderTree />
          </span>
          <span className='ml-2 cursor-default'>
            {dict.fileNavigator.rootDirectory}
          </span>
        </div>
        {renderItems(items)}
      </div>
    </div>
  );
};

export default FileSelector;
