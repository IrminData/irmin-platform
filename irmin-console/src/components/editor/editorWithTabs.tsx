'use client';

import React, { useEffect, useState } from 'react';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';

import Editor from '@/components/editor/editor';
import ScriptEditorNew from '@/components/editor/editorNew';
import Button from '@/components/misc/Button';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Bucket, BucketFile, IrminFileType } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import RenameOrMoveItemModalContent from './modals/RenameOrMoveItemModalContent';
import SaveEditorAsFileModalContent from './modals/SaveEditorAsFileModalContent';

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
  changed: boolean;
  created: boolean;
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

  const [openTabsContents, setOpenTabsContents] = useState<FileContents[]>([]);
  const activeLanguage = getLanguageFromFilename(openFileTabs[activeTab] ?? '');
  const activeTabContents = openTabsContents.find(
    (a) => a.path === openFileTabs[activeTab]
  );

  /**
   * Change the language of the active tab to the selected language
   * @param language - The language to change to
   */
  const changeLanguage = (language: IrminFileType) => {
    if (!activeTabContents) return;
    if (activeTabContents.created) {
      // The file is already created
      const fileNavItem = getItemByPath(activeTabContents.path, navigatorItems);
      if (!fileNavItem) return;
      // Prompt the user with the rename or move modal
      irminModal.show(
        dict.fileNavigator.updateFile,
        <RenameOrMoveItemModalContent
          item={fileNavItem}
          bucket={bucket}
          updateFile={updateFile}
          updateFolder={updateFolder}
        />
      );
    } else {
      // The file is not yet created
      // Update the extension at the end of the current tab path
      const newOpenFileTabs = openFileTabs.map((a, i) => {
        if (i === activeTab) {
          const path = a.split('/');
          path[path.length - 1] = `${
            path[path.length - 1].split('.')[0]
          }.${language}`;
          return path.join('/');
        }
        return a;
      });
      setOpenFileTabs(newOpenFileTabs);
    }
  };

  /**
   * Save the active tab as a file in the bucket
   *
   * If the file already exists, update the file
   * If the file does not exist, prompt to create a new file
   */
  const saveActiveTabAsFile = () => {
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
      // The file does not exist yet, create a new file
      irminModal.show(
        dict.fileNavigator.createNewFileOrFolder,
        <SaveEditorAsFileModalContent
          defaultName={activeTabContents.path.split('/').pop() ?? 'Untitled'}
          defaultPath={activeTabContents.path}
          defaultType={activeLanguage}
          contents={activeTabContents.contents}
          bucket={bucket}
          createFile={createFile}
        />
      );
    }
  };

  /**
   * Closes a tab by removing it from the open tabs and open tabs contents
   * @param index - Index of the tab to close
   */
  const closeTab = (index: number) => {
    const newTabs = openFileTabs.filter((_, i) => i !== index);
    const newOpenTabsContents = openTabsContents.filter(
      (a) => a.path !== openFileTabs[index]
    );
    setOpenTabsContents(newOpenTabsContents);
    setOpenFileTabs(newTabs);
    if (activeTab === index) {
      setActiveTab(Math.max(0, index - 1));
    }
  };

  /**
   * Set the content for the open tabs
   *
   * This effect runs when the open tabs change.
   * It makes sure that the content for each open tab is available.
   */
  useEffect(() => {
    // Check if there is content object for each open tab
    if (
      openFileTabs.every((openPath) =>
        openTabsContents.find((content) => openPath === content.path)
      )
    )
      return;
    // Build the new open tabs contents
    const newOpenTabsContents: FileContents[] = [];
    // Loop through every tab which is open and should have content
    openFileTabs.map((tab) => {
      // Check if the tab is already in the open tabs contents
      const openTabContent = openTabsContents.find((a) => a.path === tab);
      if (!openTabContent) {
        // If the tab is not found in the open tabs contents, add it with contents from the bucket
        const file = getFileByPath(tab, bucket);
        newOpenTabsContents.push({
          contents: file?.contents ?? '',
          path: tab,
          changed: false,
          created: file ? true : false,
        });
      } else {
        // If the tab is found in the open tabs contents, add it as is
        newOpenTabsContents.push(openTabContent);
      }
    });
    //  Make sure that newOpenTabsContents is different from current openTabsContents
    if (
      newOpenTabsContents.every(
        (a) =>
          openTabsContents.find((b) => b.path === a.path)?.contents ===
          a.contents
      )
    )
      return;
    // Update the open tabs contents
    setOpenTabsContents(newOpenTabsContents);
  }, [openFileTabs, openTabsContents, bucket]);

  return (
    <div>
      {openFileTabs.length > 0 && (
        <div className='mb-2 flex items-center justify-between gap-1 pr-2'>
          <div className='flex w-1/2 items-center overflow-x-auto xl:w-3/4'>
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
                  className={`min-w-28 px-2 py-1 hover:no-underline`}
                  onClick={() => setActiveTab(index)}
                >
                  {getFileByPath(tab, bucket)?.name ?? 'Untitled'}
                </Button>
                <Button
                  size='sm'
                  variant='icon'
                  colorScheme='black'
                  className={`border-none px-1 py-1`}
                  onClick={() => closeTab(index)}
                >
                  <IoClose />
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
              <IoAdd />
            </Button>
          </div>
          <select
            className='mt-2 rounded-lg border-irmin_green px-2 py-2 text-xs text-irmin_blue shadow transition-all focus:outline-none xl:text-sm'
            value={activeLanguage}
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
            size='sm'
            variant='solid'
            colorScheme='primary'
            className='mt-2 px-0 py-2 text-xs'
            ariaLabel='Save file'
            onClick={() => saveActiveTabAsFile()}
          >
            <IoSave className='mr-2 inline-block' /> {dict.editor.saveFile}
          </Button>
        </div>
      )}
      {openFileTabs.length > 0 ? (
        <Editor
          content={activeTabContents?.contents ?? ''}
          updateTabContent={(val) => {
            const newOpenTabsContents = openTabsContents.map((a) => {
              if (a.path === openFileTabs[activeTab]) {
                return { ...a, contents: val, changed: true };
              }
              return a;
            });
            setOpenTabsContents(newOpenTabsContents);
          }}
          language={activeLanguage}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
        />
      ) : (
        <ScriptEditorNew addNewTab={() => openNewTab()} />
      )}
    </div>
  );
};

export default EditorWithTabs;
