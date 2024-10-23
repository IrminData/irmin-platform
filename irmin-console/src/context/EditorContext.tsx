'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';

import { useEditorItems } from '@/context/EditorItemsContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectPath,
  getFileByPath,
  getItemByPath,
  getLanguageFromFilename,
} from '@/utils/editorItems';

import { IrminFileType } from '@/types/core/EditorItems';

/**
 * Internal type for managing file contents and file state in the editor
 */
type FileContents = {
  id: string;
  contents: string;
  originalContents: string;
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
  updateCurrentTabContent: (content: string) => void;
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
    editorItems,
    items: navigatorItems,
    saveFileContents,
    openNewTab,
    openFileTabs,
    setOpenFileTabs,
    activeTab,
    setActiveTab,
    createFile,
    updateFile,
    updateFolder,
  } = useEditorItems();
  const { dict } = useLocale();

  const [openTabsContents, setOpenTabsContents] = useState<FileContents[]>([]);
  const [editorHeight, setEditorHeight] = useState<string>('500px');

  /**
   * Change the language of the active tab to the selected language
   * @param language - The language to change to
   */
  const changeLanguage = useCallback(
    (language: IrminFileType) => {
      const currentTabPath = openFileTabs[activeTab];
      const activeTabContents = openTabsContents.find(
        (tab) => tab.path === currentTabPath
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
            editorItems={editorItems}
            updateFile={updateFile}
            updateFolder={updateFolder}
          />
        );
      } else {
        const nameParts = currentTabPath.split('/');
        const oldName = nameParts[nameParts.length - 1];
        const newName = `${oldName.split('.')[0]}.${language}`;
        const newPath = getCorrectPath(currentTabPath, newName);
        const updatedOpenTabsContents = openTabsContents.map((tab) =>
          tab.id === activeTabContents.id
            ? { ...tab, language, path: newPath }
            : tab
        );
        const updatedOpenFileTabs = openFileTabs.map((tab) =>
          tab === currentTabPath ? newPath : tab
        );
        setOpenFileTabs(updatedOpenFileTabs);
        setOpenTabsContents(updatedOpenTabsContents);
      }
    },
    [
      openTabsContents,
      openFileTabs,
      activeTab,
      navigatorItems,
      irminModal,
      dict,
      editorItems,
      updateFile,
      updateFolder,
      setOpenFileTabs,
    ]
  );

  /**
   * Save the active tab as a file in the editorItems
   *
   * If the file already exists, update the file
   * If the file does not exist, prompt to create a new file
   */
  const saveActiveTabAsFile = useCallback(() => {
    const currentTabPath = openFileTabs[activeTab];
    const activeTabContents = openTabsContents.find(
      (tab) => tab.path === currentTabPath
    );
    if (!activeTabContents) return;

    if (activeTabContents.created) {
      const file = getFileByPath(activeTabContents.path, editorItems);
      if (!file) return;
      saveFileContents({ ...file, contents: activeTabContents.contents });

      // Update originalContents after saving
      setOpenTabsContents((prevContents) =>
        prevContents.map((content) =>
          content.path === currentTabPath
            ? { ...content, originalContents: content.contents }
            : content
        )
      );
    } else {
      const activeLanguage = getLanguageFromFilename(currentTabPath);
      irminModal.show(
        dict.fileNavigator.saveFile,
        <SaveEditorAsFileModal
          defaultName={activeTabContents.path.split('/').pop() ?? 'Untitled'}
          defaultPath={activeTabContents.path}
          defaultType={activeLanguage}
          contents={activeTabContents.contents}
          editorItems={editorItems}
          createFile={createFile}
        />
      );
    }
  }, [
    openTabsContents,
    openFileTabs,
    activeTab,
    editorItems,
    saveFileContents,
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
      setOpenFileTabs(openFileTabs.filter((t) => t !== tab));
      setOpenTabsContents(
        openTabsContents.filter((content) => content.path !== tab)
      );
      if (tabIndexToClose === activeTab) {
        setActiveTab(0);
      } else if (tabIndexToClose < activeTab) {
        setActiveTab(activeTab - 1);
      }
    },
    [openFileTabs, openTabsContents, activeTab, setActiveTab, setOpenFileTabs]
  );

  /**
   * Initializes or updates open tabs contents when openFileTabs or editorItems changes
   */
  useEffect(() => {
    setOpenTabsContents((prevOpenTabsContents) => {
      const updatedOpenTabsContents = openFileTabs.map((tabPath) => {
        const existingContent = prevOpenTabsContents.find(
          (content) => content.path === tabPath
        );
        if (existingContent) {
          return existingContent;
        } else {
          const file = getFileByPath(tabPath, editorItems);
          const contents = file?.contents ?? '';
          return {
            id: crypto.randomUUID(),
            contents,
            originalContents: contents,
            language: file?.type ?? getLanguageFromFilename(tabPath),
            path: tabPath,
            created: !!file,
          };
        }
      });
      return updatedOpenTabsContents;
    });
  }, [openFileTabs, editorItems]);

  /**
   * Retrieves the current editor content based on the active tab
   */
  const currentEditor = useMemo(
    () => openTabsContents.find((tab) => tab.path === openFileTabs[activeTab]),
    [openTabsContents, openFileTabs, activeTab]
  );

  /**
   * Updates the content of the current tab
   * @param newContent - The new content for the current tab
   */
  const updateCurrentTabContent = useCallback(
    (newContent: string) => {
      const currentTabPath = openFileTabs[activeTab];
      setOpenTabsContents((prevContents) =>
        prevContents.map((content) =>
          content.path === currentTabPath
            ? { ...content, contents: newContent }
            : content
        )
      );
    },
    [openFileTabs, activeTab]
  );

  /**
   * Determines if the save button should be enabled based on unsaved changes
   */
  const enableSaveButton = useMemo(() => {
    if (!currentEditor) return false;
    return currentEditor.contents !== currentEditor.originalContents;
  }, [currentEditor]);

  return (
    <EditorContext.Provider
      value={{
        openFileTabs,
        openTabsContents,
        activeTab,
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
        updateCurrentTabContent,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
