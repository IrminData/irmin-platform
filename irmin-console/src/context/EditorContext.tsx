'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { editorItemQueryKey } from '@/lib/queryKeys';

import AddNewFileModal from '@/components/editor/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/editor/modals/AddNewFolderModal';
import CopyItemModal from '@/components/editor/modals/CopyItemModal';
import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useEditorItems } from '@/hooks/api';

import {
  getItemByPath,
  getLanguageFromFilename,
  transformEditorItemsToFileNavItem,
} from '@/utils/editorItems';

import type {
  EditorItem,
  IrminFileLanguage,
  ScriptResult,
} from '@/types/core/EditorItems';
import type { ActionInputData } from '@/types/core/Workflow';
import type { FileContents } from '@/types/internal/FileContents';
import type { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

interface EditorContextType {
  items: FileNavigatorItem[];
  loading: boolean;
  // Editor Tabs and Contents
  openFileTabs: string[];
  activeTab: number;
  editorHeight: string;
  currentEditor: FileContents | undefined;
  enableSaveButton: boolean;
  // State Setters
  setActiveTab: (_index: number) => void;
  setEditorHeight: (_height: string) => void;
  // Editor Actions
  openNewTab: () => void;
  openFile: (_file: FileNavigatorItem) => void;
  closeTab: (_tab: string) => void;
  updateCurrentTabContent: (_content: string) => void;
  saveActiveTabAsFile: () => void;
  changeLanguage: (_language: IrminFileLanguage) => void;
  // Item Actions
  addNewFile: () => void;
  addNewFolder: () => void;
  renameOrMoveItem: (_item: FileNavigatorItem) => void;
  copyItem: (_item: FileNavigatorItem) => void;
  deleteItem: (_item: FileNavigatorItem) => void;
  // Script Execution
  scriptExecutionInProgress: boolean;
  scriptExecutionResult: ScriptResult | null;
  executeScript: (_path: string) => void;
  // Script Input Files
  scriptInputFiles: ActionInputData[];
  setScriptInputFiles: (_files: ActionInputData[]) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { irminModal, irminAlert, irminConfirm } = usePopup();

  const queryClient = useQueryClient();

  const {
    editorItemsQuery,
    moveEditorItemMutation,
    copyEditorItemMutation,
    deleteEditorItemMutation,
    saveEditorItemMutation,
    createEditorFolderMutation,
    runScriptMutation,
  } = useEditorItems();

  // State for editor items
  const [currentEditorItems, setCurrentEditorItems] = useState<EditorItem[]>(
    editorItemsQuery.data?.data ?? []
  );

  // Update current editor items if query data changes
  useEffect(() => {
    setCurrentEditorItems(editorItemsQuery.data?.data ?? []);
  }, [editorItemsQuery.data]);

  // State for script input files
  const [scriptInputFiles, setScriptInputFiles] = useState<ActionInputData[]>(
    []
  );

  // Transform items for the file navigator
  const items = useMemo(
    () => transformEditorItemsToFileNavItem(currentEditorItems),
    [currentEditorItems]
  );

  // State for open tabs and active tab index
  const [openTabs, setOpenTabs] = useState<FileContents[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editorHeight, setEditorHeight] = useState('600px');
  const [untitledCounter, setUntitledCounter] = useState(1);

  // Get the current editor based on active tab
  const currentEditor = useMemo(
    () => openTabs[activeTabIndex],
    [openTabs, activeTabIndex]
  );

  /**
   * Opens a new tab with an untitled file.
   */
  const openNewTab = useCallback(() => {
    // - Generate an untitled filename and path
    const untitledName = `untitled_${untitledCounter}.txt`;
    const untitledPath = `/${untitledName}`;

    const newTab: FileContents = {
      id: crypto.randomUUID(),
      path: untitledPath,
      contents: '',
      originalContents: '',
      language: 'txt',
      created: false,
    };

    setOpenTabs((prev) => {
      const updated = [...prev, newTab];
      setActiveTabIndex(updated.length - 1);
      return updated;
    });
    setUntitledCounter((prev) => prev + 1);
  }, [untitledCounter]);

  /**
   * Opens a file in a new tab.
   *
   * @param file - File navigator item representing the file.
   */
  const openFile = useCallback(
    async (file: FileNavigatorItem) => {
      const filePath = file.current?.path ?? '';
      const existingTabIndex = openTabs.findIndex(
        (tab) => tab.path === filePath
      );

      if (existingTabIndex === -1) {
        let fileContents = '';
        try {
          // - Fetch file content from the server
          const contentRes = await queryClient.fetchQuery({
            queryKey: editorItemQueryKey(workspaceSlug, filePath),
            queryFn: async () => {
              const token = await getToken();
              const core = new IrminCore(locale, token);
              return await core.editorItemService.getEditorItemContent({
                workspace: workspaceSlug,
                path: filePath,
              });
            },
          });
          fileContents = contentRes.data ?? '';
        } catch (error) {
          console.error('Error fetching file content', error);
          irminAlert(
            'error',
            (error as Error)?.message ?? 'Failed to load file content.'
          );
        }
        const language =
          file.current?.type === 'file'
            ? getLanguageFromFilename(filePath)
            : 'txt';

        const newTab: FileContents = {
          id: crypto.randomUUID(),
          path: filePath,
          contents: fileContents,
          originalContents: fileContents,
          language,
          created: true,
        };

        setOpenTabs((prev) => {
          const updated = [...prev, newTab];
          setActiveTabIndex(updated.length - 1);
          return updated;
        });
      } else {
        setActiveTabIndex(existingTabIndex);
      }
    },
    [workspaceSlug, openTabs, irminAlert, getToken, locale, queryClient]
  );

  /**
   * Initialise open tabs from search parameters.
   */
  const setInitialOpenTabs = useRef(false);
  useEffect(() => {
    if (setInitialOpenTabs.current) return;
    const paths = searchParams.getAll('path');
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (!path) continue;
      if (openTabs.some((tab) => tab.path === path)) continue;
      const editorItem = getItemByPath(path, currentEditorItems);
      if (!editorItem) continue;
      void openFile({ current: editorItem, original: editorItem });
    }
    setInitialOpenTabs.current = true;
  }, [searchParams, currentEditorItems, openTabs, openFile]);

  /**
   * Closes a tab.
   *
   * @param tabPath - Path of the tab to close.
   */
  const closeTab = useCallback(
    (tabPath: string) => {
      const tabIndex = openTabs.findIndex((tab) => tab.path === tabPath);
      if (tabIndex !== -1) {
        setOpenTabs((prev) => prev.filter((tab) => tab.path !== tabPath));

        // - Adjust active tab index if necessary
        if (activeTabIndex >= tabIndex) {
          setActiveTabIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        }

        // - Update URL search parameters
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('path', tabPath);
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
    },
    [activeTabIndex, searchParams, openTabs, router, pathname]
  );

  /**
   * Updates the content of the current tab.
   *
   * @param newContent - New content for the current tab.
   */
  const updateCurrentTabContent = useCallback(
    (newContent: string) => {
      if (!currentEditor) return;
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === currentEditor.id ? { ...tab, contents: newContent } : tab
        )
      );
    },
    [currentEditor]
  );

  /**
   * Determines if the save button should be enabled.
   */
  const enableSaveButton = useMemo(() => {
    if (!currentEditor) return false;
    return currentEditor.contents !== currentEditor.originalContents;
  }, [currentEditor]);

  /**
   * Creates a new file.
   *
   * @param fileItem - File navigator item representing the file.
   */
  const createFile = useCallback(
    async (fileItem: EditorItem) => {
      if (fileItem.type !== 'file') return;
      await saveEditorItemMutation.mutateAsync({
        path: fileItem.path,
        content: fileItem.content ?? '',
      });
    },
    [saveEditorItemMutation]
  );

  /**
   * Saves the active tab as a file.
   */
  const saveActiveTabAsFile = useCallback(async () => {
    if (!currentEditor) return;
    if (currentEditor.created) {
      // - Save the file using the server action
      await saveEditorItemMutation.mutateAsync({
        path: currentEditor.path,
        content: currentEditor.contents,
      });
      // - Update the open tabs state by mapping over the array
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === currentEditor.id
            ? { ...tab, originalContents: currentEditor.contents }
            : tab
        )
      );
    } else {
      // - If file is new, show the SaveEditorAsFileModal for a "save as" workflow
      irminModal.show(
        dict.fileNavigator.saveFile,
        <SaveEditorAsFileModal
          defaultName={currentEditor.path.split('/').pop() ?? 'Untitled'}
          defaultPath={currentEditor.path}
          contents={currentEditor.contents}
          editorItems={currentEditorItems}
          createFile={createFile}
        />
      );
    }
  }, [
    currentEditor,
    currentEditorItems,
    dict.fileNavigator.saveFile,
    createFile,
    irminModal,
    saveEditorItemMutation,
  ]);

  /**
   * Changes the language of the active tab, as long as it's not yet a created file.
   *
   * @param language - New language for syntax highlighting.
   */
  const changeLanguage = useCallback(
    (language: IrminFileLanguage) => {
      if (!currentEditor) return;
      setOpenTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== currentEditor.id) return tab;
          // - If the file is unsaved, update its extension
          if (!tab.created) {
            const newPath = tab.path.replace(/\.\w+$/, `.${language}`);
            return { ...tab, language, path: newPath };
          }
          // - Otherwise, don't do anything
          return tab;
        })
      );
    },
    [currentEditor]
  );

  /**
   * Adds a new file via modal.
   */
  const addNewFile = useCallback(() => {
    irminModal.show(
      dict.fileNavigator.createFile,
      <AddNewFileModal
        editorItems={currentEditorItems}
        createFile={createFile}
      />
    );
  }, [
    createFile,
    currentEditorItems,
    dict.fileNavigator.createFile,
    irminModal,
  ]);

  /**
   * Adds a new folder via modal.
   */
  const addNewFolder = useCallback(() => {
    irminModal.show(
      dict.fileNavigator.createFolder,
      <AddNewFolderModal
        editorItems={currentEditorItems}
        createFolder={async (folderItem: EditorItem) => {
          if (folderItem.type !== 'folder') return;
          await createEditorFolderMutation.mutateAsync({
            path: folderItem.path,
          });
        }}
      />
    );
  }, [
    currentEditorItems,
    dict.fileNavigator.createFolder,
    irminModal,
    createEditorFolderMutation,
  ]);

  /**
   * Renames or moves an item via modal.
   *
   * @param item - File navigator item to be renamed or moved.
   */
  const renameOrMoveItem = useCallback(
    (item: FileNavigatorItem) => {
      if (!item.current) return;
      irminModal.show(
        item.current.type === 'file'
          ? dict.fileNavigator.updateFile
          : dict.fileNavigator.updateFolder,
        <RenameOrMoveItemModal
          item={item}
          editorItems={currentEditorItems}
          updateItem={async (updatedItem) => {
            if (!updatedItem.original || !updatedItem.current) return;
            // - Move file if its path has changed
            if (updatedItem.original.path == updatedItem.current.path) return;
            await moveEditorItemMutation.mutateAsync({
              path: updatedItem.original.path,
              destinationPath: updatedItem.current.path,
            });
          }}
        />
      );
    },
    [currentEditorItems, dict.fileNavigator, irminModal, moveEditorItemMutation]
  );

  /**
   * Copies an item in the file navigator.
   *
   * @param item - File navigator item to be copied.
   */
  const copyItem = useCallback(
    (item: FileNavigatorItem) => {
      if (!item.current) return;
      irminModal.show(
        item.current.type === 'file'
          ? dict.fileNavigator.updateFile
          : dict.fileNavigator.updateFolder,
        <CopyItemModal
          item={item}
          editorItems={currentEditorItems}
          copyItem={async (updatedItem) => {
            if (!updatedItem.original || !updatedItem.current) return;
            await copyEditorItemMutation.mutateAsync({
              path: updatedItem.original.path,
              destinationPath: updatedItem.current.path,
            });
          }}
        />
      );
    },
    [currentEditorItems, dict.fileNavigator, irminModal, copyEditorItemMutation]
  );

  /**
   * Deletes an item with confirmation.
   *
   * @param item - File navigator item to be deleted.
   */
  const deleteItem = useCallback(
    async (item: FileNavigatorItem) => {
      if (!item.current) return;
      const editorItem = item.original ?? item.current;
      if (!editorItem) return;
      const itemName = item.current.name || 'this item';
      const confirmed = await irminConfirm(
        'warning',
        `${dict.fileNavigator.deleteConfirmation} ${itemName}?`
      );
      if (!confirmed) return;
      await deleteEditorItemMutation.mutateAsync({
        path: editorItem.path,
      });
      // - Close the tab if the item is a file
      if (editorItem.type === 'file') {
        closeTab(item.current!.path);
      }
    },
    [
      closeTab,
      dict.fileNavigator.deleteConfirmation,
      irminConfirm,
      deleteEditorItemMutation,
    ]
  );

  /**
   * Executes a script in the Compute Sandbox.
   *
   * @param item - File navigator item representing the script.
   */
  const [scriptExecutionResult, setScriptExecutionResult] =
    useState<ScriptResult | null>(null);
  const executeScript = useCallback(
    async (path: string) => {
      if (!path) return;
      irminAlert('info', dict.editor.scriptExecutionStarted);
      const res = await runScriptMutation.mutateAsync({
        path,
        inputs: scriptInputFiles,
      });
      setScriptExecutionResult(res.data ?? null);
    },
    [dict, irminAlert, runScriptMutation, scriptInputFiles]
  );

  const loading =
    editorItemsQuery.isPending ||
    moveEditorItemMutation.isPending ||
    copyEditorItemMutation.isPending ||
    deleteEditorItemMutation.isPending ||
    saveEditorItemMutation.isPending;

  return (
    <EditorContext.Provider
      value={{
        items,
        loading,
        // Editor Tabs and Contents
        openFileTabs: openTabs.map((tab) => tab.path),
        activeTab: activeTabIndex,
        editorHeight,
        currentEditor,
        enableSaveButton,
        // State Setters
        setActiveTab: setActiveTabIndex,
        setEditorHeight,
        // Editor Actions
        openNewTab,
        openFile,
        closeTab,
        updateCurrentTabContent,
        saveActiveTabAsFile,
        changeLanguage,
        // Item Actions
        addNewFile,
        addNewFolder,
        renameOrMoveItem,
        copyItem,
        deleteItem,
        // Script Execution
        scriptExecutionInProgress: runScriptMutation.isPending,
        scriptExecutionResult,
        executeScript,
        // Script Input Files
        scriptInputFiles,
        setScriptInputFiles,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
