'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import RenameOrMoveItemModal from '@/components/bucket/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/bucket/modals/SaveEditorAsFileModal';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { getCorrectPath } from '@/utils/bucket';

import { Bucket, BucketFile, IrminFileType } from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

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
 * Context for managing the editor state
 *
 * Provides functions to manage open tabs, active tab, and editor content, as well as functions to
 * interact with the editor.
 */
interface EditorContextType {
  openFileTabs: string[];
  openTabsContents: FileContents[];
  activeTab: number;
  currentTabContent: string;
  setCurrentTabContent: (value: string) => void;
  setEditorHeight: React.Dispatch<React.SetStateAction<string>>;
  setOpenFileTabs: (tabs: string[]) => void;
  setActiveTab: (index: number) => void;
  saveActiveTabAsFile: () => void;
  closeTab: (tab: string) => void;
  changeLanguage: (language: IrminFileType) => void;
  openNewTab: () => void;
  editorHeight: string;
  enableSaveButton: boolean;
  currentEditor: FileContents | undefined;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorContextProvider');
  }
  return context;
};

export const EditorContextProvider = ({
  children,
}: {
  children: React.ReactNode;
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

  const currentTabContentForRef = React.useRef<string>('');
  const [currentTabContent, setCurrentTabContent] = useState<string>('');
  const [openTabsContents, setOpenTabsContents] = useState<FileContents[]>([]);
  const [editorHeight, setEditorHeight] = useState<string>('500px');

  /**
   * Get the language from a filename
   * @param filename - Filename to get the language from
   */
  const getLanguageFromFilename = (filename: string): IrminFileType => {
    const extension = filename.split('.').pop();
    if (extension === 'sql') return extension;
    if (extension === 'js') return extension;
    if (extension === 'py') return extension;
    if (extension === 'php') return extension;
    return 'sql';
  };

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
  const getItemByPath = useCallback(
    (
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
    },
    []
  );

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
        const fileNavItem = getItemByPath(
          activeTabContents.path,
          navigatorItems
        );
        if (!fileNavItem) return;
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
        const nameParts = openFileTabs[activeTab].split('/');
        const newName = (nameParts[nameParts.length - 1] =
          `${nameParts[nameParts.length - 1].split('.')[0]}.${language}`);
        const newPath = getCorrectPath(openFileTabs[activeTab], newName);
        const newOpenTabsContents = openTabsContents.map((a) =>
          a.path === openFileTabs[activeTab]
            ? { ...a, language, path: newPath }
            : a
        );
        const newOpenFileTabs = openFileTabs.map((a) =>
          a === openFileTabs[activeTab] ? newPath : a
        );
        setOpenFileTabs(newOpenFileTabs);
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
      getItemByPath,
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
    if (activeTabContents.created) {
      const file = getFileByPath(activeTabContents.path, bucket);
      if (!file) return;
      updateFileContents({ ...file, contents: activeTabContents.contents });
    } else {
      const canSave =
        (openTabsContents.find((a) => a.path === openFileTabs[activeTab])
          ?.contents ?? '') === currentTabContent;
      if (!canSave) return;
      const activeLanguage = getLanguageFromFilename(
        openFileTabs[activeTab] ?? ''
      );
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
   * @param tab - Path of the tab to close
   */
  const closeTab = useCallback(
    (tab: string) => {
      const tabIndexToClose = openFileTabs.findIndex((t) => t === tab);
      if (tabIndexToClose === activeTab) setActiveTab(0);
      if (tabIndexToClose < activeTab) setActiveTab(activeTab - 1);
      setOpenTabsContents(openTabsContents.filter((a) => a.path !== tab));
      setOpenFileTabs(openFileTabs.filter((t) => t !== tab));
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
    let debounceTimeout: NodeJS.Timeout | undefined;

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
    } else {
      debounceTimeout = setTimeout(() => {
        if (currentTabContentForRef.current !== openFileTabs[activeTab]) {
          currentTabContentForRef.current = openFileTabs[activeTab];
          const newTabContents = openTabsContents.find(
            (a) => a.path === openFileTabs[activeTab]
          );
          if (!newTabContents) setCurrentTabContent('');
          if (currentTabContent !== (newTabContents?.contents ?? '')) {
            setCurrentTabContent(newTabContents?.contents ?? '');
          }
        }
        const newOpenTabsContents = openTabsContents.map((a) =>
          currentTabContentForRef.current === a.path
            ? { ...a, contents: currentTabContent }
            : a
        );
        setOpenTabsContents(newOpenTabsContents);
      }, 200);
    }
    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [activeTab, openFileTabs, currentTabContent, openTabsContents, bucket]);

  /** Check if the save button should be enabled or not, based on whether the state is up to date **/
  const enableSaveButton = useMemo(
    () =>
      (openTabsContents.find((a) => a.path === openFileTabs[activeTab])
        ?.contents ?? '') === currentTabContent,
    [openTabsContents, openFileTabs, activeTab, currentTabContent]
  );

  /**
   * Get the current editor content based on the active tab
   * Returns {@link FileContents} or undefined if the tab is not found
   */
  const currentEditor = useMemo(
    () => openTabsContents.find((a) => a.path === openFileTabs[activeTab]),
    [openTabsContents, openFileTabs, activeTab]
  );

  return (
    <EditorContext.Provider
      value={{
        openFileTabs,
        openTabsContents,
        activeTab,
        currentTabContent,
        setCurrentTabContent,
        setEditorHeight,
        setOpenFileTabs,
        setActiveTab,
        saveActiveTabAsFile,
        closeTab,
        changeLanguage,
        openNewTab,
        editorHeight,
        enableSaveButton,
        currentEditor,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
