'use client';

import { createContext, useContext } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/lib/core';

import AddNewFileModal from '@/components/editor/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/editor/modals/AddNewFolderModal';
import CopyItemModal from '@/components/editor/modals/CopyItemModal';
import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import {
  getItemByPath,
  getLanguageFromFilename,
  transformEditorItemsToFileNavItem,
} from '@/utils/editorItems';

import {
  EditorItem,
  IrminFileLanguage,
  ScriptResult,
} from '@/types/core/EditorItems';
import { FileContents } from '@/types/internal/FileContents';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

interface EditorContextType {
  items: FileNavigatorItem[];
  loading: boolean;
  fetchEditorItems: () => Promise<void>;
  // Editor Tabs and Contents
  openFileTabs: string[];
  activeTab: number;
  editorHeight: string;
  currentEditor: FileContents | undefined;
  enableSaveButton: boolean;
  // State Setters
  setActiveTab: (index: number) => void;
  setEditorHeight: (height: string) => void;
  // Editor Actions
  openNewTab: () => void;
  openFile: (file: FileNavigatorItem) => void;
  closeTab: (tab: string) => void;
  updateCurrentTabContent: (content: string) => void;
  saveActiveTabAsFile: () => void;
  changeLanguage: (language: IrminFileLanguage) => void;
  // Item Actions
  addNewFile: () => void;
  addNewFolder: () => void;
  renameOrMoveItem: (item: FileNavigatorItem) => void;
  copyItem: (item: FileNavigatorItem) => void;
  deleteItem: (item: FileNavigatorItem) => void;
  // Script Execution
  scriptExecutionInProgress: boolean;
  scriptExecutionResult: ScriptResult | null;
  executeScript: (path: string) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({
  children,
  editorItems,
}: {
  children: React.ReactNode;
  editorItems: EditorItem[];
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { workspaceSlug } = useWorkspace();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { irminModal, irminAlert, irminConfirm } = usePopup();

  const [loading, setLoading] = useState(false);

  // State for editor items (flat array of EditorItem)
  const [currentEditorItems, setCurrentEditorItems] =
    useState<EditorItem[]>(editorItems);

  // Update current editor items if prop changes
  useEffect(() => {
    setCurrentEditorItems(editorItems);
  }, [editorItems]);

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
   * Function to refetch the editor items.
   */
  const fetchEditorItems = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const editorItemsRes = await irminCore.editorItemService.listEditorItems({
        workspace: workspaceSlug,
        path: '',
      });
      if (!editorItemsRes.data) {
        irminAlert(
          'error',
          editorItemsRes.message ?? 'Failed to fetch editor items.'
        );
        return;
      }
      setCurrentEditorItems(editorItemsRes.data ?? []);
    } catch (error) {
      console.error('Error fetching editor items', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch editor items.'
      );
    }
  }, [getToken, locale, workspaceSlug, irminAlert]);

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
          const token = await getToken();
          const irminCore = new IrminCore(locale, token);
          const fileContentsRes =
            await irminCore.editorItemService.getEditorItemContent({
              workspace: workspaceSlug,
              path: filePath,
            });
          if (!fileContentsRes.data) {
            irminAlert(
              'error',
              fileContentsRes.message ?? 'Failed to load file content.'
            );
            return;
          }
          fileContents = fileContentsRes.data ?? '';
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
    [workspaceSlug, openTabs, irminAlert, getToken, locale]
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
      openFile({ current: editorItem, original: editorItem });
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

      try {
        setLoading(true);
        // - Save new file using the server action
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.editorItemService.saveEditorItem({
          workspace: workspaceSlug,
          path: fileItem.path,
          content: fileItem.content ?? '',
        });
        // - Refetch the editor items
        await fetchEditorItems();
        // - Show success message
        irminAlert('success', res.message ?? 'File created successfully');
      } catch (error) {
        console.error('File creation error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'File creation failed.'
        );
      } finally {
        setLoading(false);
      }
    },
    [workspaceSlug, irminAlert, getToken, locale, fetchEditorItems]
  );

  /**
   * Saves the active tab as a file.
   */
  const saveActiveTabAsFile = useCallback(async () => {
    if (!currentEditor) return;
    if (currentEditor.created) {
      try {
        setLoading(true);
        // - Save the file using the server action
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.editorItemService.saveEditorItem({
          workspace: workspaceSlug,
          path: currentEditor.path,
          content: currentEditor.contents,
        });
        // - Refetch the editor items
        await fetchEditorItems();
        // - Update the open tabs state by mapping over the array
        setOpenTabs((prev) =>
          prev.map((tab) =>
            tab.id === currentEditor.id
              ? { ...tab, originalContents: currentEditor.contents }
              : tab
          )
        );
        // - Show success message
        irminAlert('success', res.message ?? 'File saved successfully');
      } catch (error) {
        console.error('File save error', error);
        irminAlert('error', (error as Error)?.message ?? 'File saving failed.');
      } finally {
        setLoading(false);
      }
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
    fetchEditorItems,
    workspaceSlug,
    currentEditor,
    currentEditorItems,
    dict.fileNavigator.saveFile,
    createFile,
    irminAlert,
    irminModal,
    getToken,
    locale,
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
          try {
            setLoading(true);
            const token = await getToken();
            const irminCore = new IrminCore(locale, token);
            const res = await irminCore.editorItemService.createEditorFolder({
              workspace: workspaceSlug,
              path: folderItem.path,
            });
            // - Refetch the editor items
            await fetchEditorItems();
            // - Send a success message
            irminAlert('success', res.message ?? 'Folder created successfully');
          } catch (error) {
            console.error('Folder creation error', error);
            irminAlert(
              'error',
              (error as Error)?.message ?? 'Folder creation failed.'
            );
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  }, [
    getToken,
    locale,
    workspaceSlug,
    currentEditorItems,
    dict.fileNavigator.createFolder,
    irminAlert,
    irminModal,
    fetchEditorItems,
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
            try {
              setLoading(true);
              const token = await getToken();
              const irminCore = new IrminCore(locale, token);
              const res = await irminCore.editorItemService.moveEditorItem({
                workspace: workspaceSlug,
                path: updatedItem.original.path,
                destinationPath: updatedItem.current.path,
              });
              // - Refetch the editor items
              await fetchEditorItems();
              // - Send a success message
              irminAlert('success', res.message ?? 'File updated successfully');
            } catch (error) {
              console.error('File update error', error);
              irminAlert(
                'error',
                (error as Error)?.message ?? 'File update failed.'
              );
            } finally {
              setLoading(false);
            }
          }}
        />
      );
    },
    [
      workspaceSlug,
      currentEditorItems,
      dict.fileNavigator,
      irminAlert,
      irminModal,
      getToken,
      locale,
      fetchEditorItems,
    ]
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
            try {
              setLoading(true);
              const token = await getToken();
              const irminCore = new IrminCore(locale, token);
              const res = await irminCore.editorItemService.copyEditorItem({
                workspace: workspaceSlug,
                path: updatedItem.original.path,
                destinationPath: updatedItem.current.path,
              });
              // - Refetch the editor items
              await fetchEditorItems();
              // - Send a success message
              irminAlert('success', res.message ?? 'Item copied successfully');
            } catch (error) {
              console.error('Item copying error', error);
              irminAlert(
                'error',
                (error as Error)?.message ?? 'Item copying failed.'
              );
            } finally {
              setLoading(false);
            }
          }}
        />
      );
    },
    [
      workspaceSlug,
      currentEditorItems,
      dict.fileNavigator,
      irminAlert,
      irminModal,
      getToken,
      locale,
      fetchEditorItems,
    ]
  );

  /**
   * Deletes an item with confirmation.
   *
   * @param item - File navigator item to be deleted.
   */
  const deleteItem = useCallback(
    (item: FileNavigatorItem) => {
      if (!item.current) return;
      const itemName = item.current.name || 'this item';
      irminConfirm(
        'warning',
        `${dict.fileNavigator.deleteConfirmation} ${itemName}?`
      ).then(async (confirmed) => {
        if (!confirmed) return;
        try {
          setLoading(true);
          const editorItem = item.original ?? item.current;
          if (!editorItem) return;
          const token = await getToken();
          const irminCore = new IrminCore(locale, token);
          const res = await irminCore.editorItemService.deleteEditorItem({
            workspace: workspaceSlug,
            path: editorItem.path,
          });
          // - Close the tab if the item is a file
          if (editorItem.type === 'file') {
            closeTab(item.current!.path);
          }
          // - Refetch the editor items
          await fetchEditorItems();
          // - Give a success message
          irminAlert('success', res.message ?? `Item deleted successfully`);
        } catch (error) {
          console.error('Item deletion error', error);
          irminAlert(
            'error',
            (error as Error)?.message ?? 'Item deletion failed.'
          );
        } finally {
          setLoading(false);
        }
      });
    },
    [
      workspaceSlug,
      closeTab,
      dict.fileNavigator.deleteConfirmation,
      irminAlert,
      getToken,
      locale,
      irminConfirm,
      fetchEditorItems,
    ]
  );

  /**
   * Executes a script in the Compute Sandbox.
   *
   * @param item - File navigator item representing the script.
   */
  const scriptExecuting = useRef(false);
  const [scriptExecutionInProgress, setScriptExecutionInProgress] =
    useState(false);
  const [scriptExecutionResult, setScriptExecutionResult] =
    useState<ScriptResult | null>(null);
  const executeScript = useCallback(
    async (path: string) => {
      if (!path) return;
      if (scriptExecuting.current) return;
      scriptExecuting.current = true;
      setScriptExecutionInProgress(true);
      try {
        irminAlert('info', dict.editor.scriptExecutionStarted);
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.editorItemService.createEditorFolder({
          workspace: workspaceSlug,
          path,
        });
        if (res.message) {
          irminAlert('info', res.message);
        }
        setScriptExecutionResult(res.data ?? null);
      } catch (error) {
        console.error('QueryContext handleExecuteSql error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to execute SQL query'
        );
      }
      setScriptExecutionInProgress(false);
      scriptExecuting.current = false;
    },
    [dict, workspaceSlug, irminAlert, getToken, locale]
  );

  return (
    <EditorContext.Provider
      value={{
        items,
        loading,
        fetchEditorItems,
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
        scriptExecutionInProgress,
        scriptExecutionResult,
        executeScript,
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
