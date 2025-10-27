'use client';

import { useCallback, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiFile, FiFolder } from 'react-icons/fi';
import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useEditorItems } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { EditorItem } from '@/types/core/EditorItems';

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
 * @param fileSelectorProps.currentSelectedFile - The currently selected file path, if any
 * @param fileSelectorProps.onSelectFile - Function to call when a file is selected
 */
const FileSelector = ({
  currentSelectedFile,
  onSelectFile,
}: {
  currentSelectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}) => {
  const { dict } = useLocale();

  const { editorItemsQuery } = useEditorItems();

  // State for the open folders in the file navigator
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  // Keep track of the currently selected file
  const [selectedFile, setSelectedFile] = useState<string>(
    currentSelectedFile ?? ''
  );

  /**
   * Toggle a folder in the file navigator
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
   * Handle clicking an item (folder or file) in the file navigator
   *
   * @param item - The clicked item
   */
  const handleItemClick = useCallback(
    (item: EditorItem) => {
      if (item.type === 'folder') {
        // Toggle folder open/close
        toggleFolder(item);
      } else if (item.type === 'file') {
        // Select file
        setSelectedFile(item.path);
        onSelectFile(item.path);
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
    (itemsToRender: EditorItem[]) => {
      const render = (items: EditorItem[]): React.ReactNode[] =>
        items.map((item) => {
          // Render folder
          if (item.type === 'folder') {
            return (
              <div key={item.path} className='my-1'>
                <div
                  className={`
                    flex cursor-pointer items-center justify-normal rounded-md
                    p-1 text-sm
                    hover:bg-gray-200
                    dark:hover:bg-gray-800
                  `}
                  onClick={() => handleItemClick(item)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleItemClick(item);
                    }
                  }}
                >
                  {openFolders[item.name] ? (
                    <TbChevronDown
                      className='inline-block'
                      aria-label={`Close folder ${item.name} in the file navigator`}
                    />
                  ) : (
                    <TbChevronRight
                      className='inline-block'
                      aria-label={`Open folder ${item.name} in the file navigator`}
                    />
                  )}
                  <span className='ml-2'>
                    <FiFolder />
                  </span>
                  <span
                    className={`
                      ml-2
                      hover:underline
                    `}
                    aria-label={`Open ${item.name} folder`}
                  >
                    {item.name}
                  </span>
                </div>
                {openFolders[item.name] && (
                  <div className='pl-6'>{render(item.children ?? [])}</div>
                )}
              </div>
            );
          }

          // Render file
          if (item.type === 'file') {
            const isSelected = item.path === selectedFile;
            return (
              <div
                key={item.path}
                className={`
                  my-1 ml-6 flex cursor-pointer items-center justify-normal
                  rounded-md p-1 text-sm
                  ${
                    isSelected
                      ? `
                        bg-gray-200
                        dark:bg-gray-800
                      `
                      : `
                        hover:bg-gray-200
                        dark:hover:bg-gray-800
                      `
                  }
                `}
                onClick={() => handleItemClick(item)}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleItemClick(item);
                  }
                }}
              >
                <span className='ml-2'>
                  <FiFile />
                </span>
                <span
                  className={`
                    ml-2
                    hover:underline
                  `}
                  aria-label={`Select file ${item.name}`}
                >
                  {item.name}
                </span>
              </div>
            );
          }

          return null;
        });
      return render(itemsToRender);
    },
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
      className={`
        relative mb-2 max-h-48 overflow-y-scroll border-b pb-4
        dark:border-b-gray-800
      `}
    >
      {currentSelectedFile && currentSelectedFile.length > 0 && (
        <ButtonWithTooltip
          href={`${workspaceUrl}/editor?path=${currentSelectedFile}`}
          target='_blank'
          variant='secondary'
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
        {editorItemsQuery.isLoading && <LoadingSpinner />}
        {renderItems(editorItemsQuery.data?.data ?? [])}
      </div>
    </div>
  );
};

export default FileSelector;
