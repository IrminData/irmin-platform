'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { getCorrectPath } from '@/lib/utils/bucketUtils';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';

import Editor from '@/components/editor/editor';
import ScriptEditorNew from '@/components/editor/editorNew';
import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';
import Button from '@/components/misc/Button';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Bucket, BucketFile, IrminFileType } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Get the language from a filename
 * @param filename - Filename to get the language from
 */
function getLanguageFromFilename(filename: string): IrminFileType {
  const extension = filename.split('.').pop();
  if (extension === 'sql') return extension;
  if (extension === 'js') return extension;
  if (extension === 'py') return extension;
  return 'sql';
}

/**
 * Find a file by path in the bucket
 * @param path - Path of the file to find
 * @param bucket - Bucket to search in
 * @returns The file if found, undefined otherwise
 */
const getFileByPath = (
  path: string,
  bucket: Bucket | null
): BucketFile | undefined => {
  if (!bucket) return;
  return bucket.files.find((a) => a.path === path);
};

/**
 * Recursive function to get an item by path in the file navigator
 * @param path - Path of the item to find
 * @param items - Items to search in
 * @returns The item if found, undefined otherwise
 */
const getItemByPath = (
  path: string,
  items: FileNavigatorItem[]
): FileNavigatorItem | undefined => {
  for (const item of items) {
    if (item.current?.path === path) return item;
    if (item.type === 'folder' && item.children) {
      const found = getItemByPath(path, item.children);
      if (found) return found;
    }
  }
};

/**
 * Internal type for managing file contents and file state in the editor
 */
type FileContents = {
  contents: string;
  path: string;
  created: boolean;
  language: IrminFileType;
};

/**
 * File editor UI with tabs
 * Shows a tabbed editor with multiple tabs
 * Uses {@link Editor} for normal editor
 * Uses {@link ScriptEditorNew} when starting a new tab
 */
const EditorWithTabs = ({
  editorHeight,
  setEditorHeight,
}: {
  editorHeight: string;
  setEditorHeight: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { irminModal } = usePopup();
  const {
    bucket,
    items: navigatorItems,
    updateFileContents,
    openNewTab,
    openFileTabs,
    setOpenFileTabs,
    activeTab,
    setActiveTab,
    createFile,
    updateFile,
    updateFolder,
  } = useBucket();
  const { dict } = useLocale();

  const [currentTabContentFor, setCurrentTabContentFor] = useState<string>('');
  const [currentTabContent, setCurrentTabContent] = useState<string>('');

  const [openTabsContents, setOpenTabsContents] = useState<FileContents[]>([]);

  /**
   * Change the language of the active tab to the selected language
   * @param language - The language to change to
   */
  const changeLanguage = useCallback(
    (language: IrminFileType) => {
      const activeTabContents = openTabsContents.find(
        (a) => a.path === openFileTabs[activeTab]
      );
      if (!activeTabContents) return;
      if (activeTabContents.created) {
        // The file is already created
        const fileNavItem = getItemByPath(
          activeTabContents.path,
          navigatorItems
        );
        if (!fileNavItem) return;
        // Prompt the user with the rename or move modal
        irminModal.show(
          dict.fileNavigator.updateFile,
          <RenameOrMoveItemModal
            item={fileNavItem}
            bucket={bucket}
            updateFile={updateFile}
            updateFolder={updateFolder}
          />
        );
      } else {
        // The file is not yet created
        // Get the new path and name
        const nameParts = openFileTabs[activeTab].split('/');
        const newName = (nameParts[nameParts.length - 1] = `${
          nameParts[nameParts.length - 1].split('.')[0]
        }.${language}`);
        const newPath = getCorrectPath(openFileTabs[activeTab], newName);
        // Change the language, path and name in openTabsContents
        const newOpenTabsContents = openTabsContents.map((a) => {
          if (a.path === openFileTabs[activeTab]) {
            return {
              ...a,
              language,
              path: newPath,
            };
          }
          return a;
        });
        // Change the openFileTabs to the new path
        const newOpenFileTabs = openFileTabs.map((a) =>
          a === openFileTabs[activeTab] ? newPath : a
        );
        setOpenFileTabs(newOpenFileTabs);
        // Change the language, path and name in openFileTabs
        setOpenTabsContents(newOpenTabsContents);
      }
    },
    [
      openTabsContents,
      openFileTabs,
      activeTab,
      navigatorItems,
      irminModal,
      dict,
      bucket,
      updateFile,
      updateFolder,
      setOpenFileTabs,
    ]
  );

  /**
   * Save the active tab as a file in the bucket
   *
   * If the file already exists, update the file
   * If the file does not exist, prompt to create a new file
   */
  const saveActiveTabAsFile = useCallback(() => {
    const activeTabContents = openTabsContents.find(
      (a) => a.path === openFileTabs[activeTab]
    );
    if (!activeTabContents) return;
    // Check if the file already exists in the bucket
    if (activeTabContents.created) {
      const file = getFileByPath(activeTabContents.path, bucket);
      if (!file) return;
      // File already exists. Update the file in the bucket
      updateFileContents({
        ...file,
        contents: activeTabContents.contents,
      });
    } else {
      // Make sure that can save
      const canSave =
        (openTabsContents.find((a) => a.path === openFileTabs[activeTab])
          ?.contents ?? '') === currentTabContent;
      if (!canSave) return;
      // Get active language from the filename
      const activeLanguage = getLanguageFromFilename(
        openFileTabs[activeTab] ?? ''
      );
      // The file does not exist yet, create a new file
      irminModal.show(
        dict.fileNavigator.saveFile,
        <SaveEditorAsFileModal
          defaultName={activeTabContents.path.split('/').pop() ?? 'Untitled'}
          defaultPath={activeTabContents.path}
          defaultType={activeLanguage}
          contents={activeTabContents.contents}
          bucket={bucket}
          createFile={createFile}
        />
      );
    }
  }, [
    currentTabContent,
    openTabsContents,
    openFileTabs,
    activeTab,
    bucket,
    updateFileContents,
    irminModal,
    dict,
    createFile,
  ]);

  /**
   * Closes a tab by removing it from the open tabs and open tabs contents
   * @param index - Index of the tab to close
   */
  const closeTab = useCallback(
    (index: number) => {
      const newTabs = openFileTabs.filter((_, i) => i !== index);
      const newOpenTabsContents = openTabsContents.filter(
        (a) => a.path !== openFileTabs[index]
      );
      setOpenTabsContents(newOpenTabsContents);
      setOpenFileTabs(newTabs);
      if (activeTab === index) {
        setActiveTab(Math.max(0, index - 1));
      }
    },
    [openFileTabs, openTabsContents, activeTab, setActiveTab, setOpenFileTabs]
  );

  /**
   * Manages content updates for open tabs and the active tab
   *
   * @remarks
   *
   * This effect ensures that the content for each open tab is available and synchronises the current tab content with the editor.
   * It is responsible for updating {@link openTabsContents}, {@link currentTabContent}, and {@link currentTabContentFor}.
   */
  useEffect(() => {
    const updateOpenTabsContents = () => {
      const newOpenTabsContents: FileContents[] = [];

      openFileTabs.forEach((tab) => {
        const openTabContent = openTabsContents.find((a) => a.path === tab);
        if (!openTabContent) {
          const file = getFileByPath(tab, bucket);
          newOpenTabsContents.push({
            contents: file?.contents ?? '',
            language: file?.type ?? getLanguageFromFilename(tab),
            path: tab,
            created: file ? true : false,
          });
        } else {
          newOpenTabsContents.push(openTabContent);
        }
      });

      if (
        !newOpenTabsContents.every(
          (a) =>
            openTabsContents.find((b) => b.path === a.path)?.contents ===
            a.contents
        )
      ) {
        setOpenTabsContents(newOpenTabsContents);
      }
    };

    const updateCurrentTabContent = () => {
      if (currentTabContentFor !== openFileTabs[activeTab]) {
        setCurrentTabContentFor(openFileTabs[activeTab]);
        const newTabContents = openTabsContents.find(
          (a) => a.path === openFileTabs[activeTab]
        );
        if (!newTabContents) setCurrentTabContent('');
        if (currentTabContent !== (newTabContents?.contents ?? '')) {
          setCurrentTabContent(newTabContents?.contents ?? '');
        }
      } else {
        const debounceTimeout = setTimeout(() => {
          const newOpenTabsContents = openTabsContents.map((a) => {
            if (currentTabContentFor === a.path) {
              return { ...a, contents: currentTabContent };
            }
            return a;
          });
          setOpenTabsContents(newOpenTabsContents);
        }, 200);
        return () => {
          clearTimeout(debounceTimeout);
        };
      }
    };

    // Ensure content is available for all open tabs
    updateOpenTabsContents();

    // Update the current tab content when the active tab changes
    updateCurrentTabContent();
  }, [
    activeTab,
    openFileTabs,
    currentTabContentFor,
    currentTabContent,
    openTabsContents,
    bucket,
  ]);

  // Check if the save button should be enabled or not, based on whether the state is up to date
  const enableSaveButton =
    (openTabsContents.find((a) => a.path === openFileTabs[activeTab])
      ?.contents ?? '') === currentTabContent;

  return (
    <div>
      {openFileTabs.length > 0 && (
        <div className='mb-0 flex items-center justify-between gap-1 border-b border-gray-200 pb-1 pr-2'>
          <div className='scrollbar-hide flex items-center overflow-x-auto'>
            {openFileTabs.map((tab, index) => (
              <div
                key={index}
                className={`flex h-fit items-center ${
                  activeTab === index ? 'border-b-2 border-irmin_green' : ''
                } `}
              >
                <Button
                  size='sm'
                  variant='link'
                  colorScheme='black'
                  className={`min-w-20 px-2 py-1 hover:no-underline`}
                  onClick={() => setActiveTab(index)}
                  ariaLabel={`Switch to tab ${tab}`}
                >
                  {tab.replace(/.*\/([^/]+)\..*$/, '$1') ?? 'Untitled'}
                </Button>
                <Button
                  size='sm'
                  variant='icon'
                  colorScheme='black'
                  className={`border-none px-1 py-1`}
                  onClick={() => closeTab(index)}
                >
                  <IoClose size={12} />
                </Button>
              </div>
            ))}
            <Button
              variant='icon'
              size='sm'
              className={`border-none px-1 py-1`}
              colorScheme='black'
              onClick={() => openNewTab()}
              ariaLabel='Add new tab'
            >
              <IoAdd size={18} />
            </Button>
          </div>
          <div className='flex flex-row items-center justify-end gap-2'>
            <select
              className='mt-2 hidden rounded-lg border-r-2 border-white px-2 py-2 text-xs text-irmin_blue shadow focus:outline-none md:block xl:text-sm'
              value={getLanguageFromFilename(openFileTabs[activeTab] ?? '')}
              onChange={(e) => {
                e.preventDefault();
                changeLanguage(e.target.value as IrminFileType);
              }}
            >
              <option value={'sql'}>SQL</option>
              <option value={'js'}>JavaScript</option>
              <option value={'py'}>Python</option>
            </select>
            <Button
              disabled={!enableSaveButton}
              size='sm'
              variant='solid'
              colorScheme='primary'
              className='mt-2 px-2 py-2 text-xs'
              ariaLabel='Save file'
              onClick={() => saveActiveTabAsFile()}
            >
              <IoSave className='mr-2 inline-block' /> {dict.editor.saveFile}
            </Button>
          </div>
        </div>
      )}
      {currentTabContentFor !== openFileTabs[activeTab] &&
      openFileTabs.length > 0 ? (
        <div className='w-full bg-white' style={{ height: editorHeight }} />
      ) : (
        <>
          {openFileTabs.length > 0 ? (
            <Editor
              content={currentTabContent}
              updateTabContent={(value) => setCurrentTabContent(value)}
              language={getLanguageFromFilename(openFileTabs[activeTab] ?? '')}
              editorHeight={editorHeight}
              setEditorHeight={setEditorHeight}
            />
          ) : (
            <ScriptEditorNew addNewTab={() => openNewTab()} />
          )}
        </>
      )}
    </div>
  );
};

export default EditorWithTabs;
