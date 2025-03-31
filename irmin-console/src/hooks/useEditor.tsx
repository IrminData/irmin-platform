import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  copyEditorItem,
  createEditorFolder,
  deleteEditorItem,
  getEditorItemContent,
  moveEditorItem,
  saveEditorItem,
} from '@/lib/actions/editor-items';

import AddNewFileModal from '@/components/editor/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/editor/modals/AddNewFolderModal';
import CopyItemModal from '@/components/editor/modals/CopyItemModal';
import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import {
  getItemByPath,
  getLanguageFromFilename,
  transformEditorItemsToFileNavItem,
} from '@/utils/editorItems';

import { EditorItem, IrminFileLanguage } from '@/types/core/EditorItems';
import { FileContents } from '@/types/internal/FileContents';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Hook to manage editor items and state using new server actions.
 *
 * @param editorItems - Current editor items.
 * @returns Object with editor state and methods.
 */
export const useEditor = (editorItems: EditorItem[]) => {
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspace();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { irminModal, irminAlert, irminConfirm } = usePopup();

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
  const currentEditor = openTabs[activeTabIndex];

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
          const fileContentsRes = await getEditorItemContent({
            workspace: workspaceSlug,
            path: filePath,
          });
          fileContents = fileContentsRes.data ?? '';
        } catch (error) {
          irminAlert('error', 'Could not load file content.');
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
    [workspaceSlug, openTabs, irminAlert]
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
        // - Save new file using the server action
        const res = await saveEditorItem({
          workspace: workspaceSlug,
          item: fileItem,
        });
        irminAlert('success', res.message ?? 'File created successfully');
        setCurrentEditorItems((prev) => [...prev, fileItem]);
      } catch (error) {
        irminAlert('error', 'File creation failed.');
      }
    },
    [workspaceSlug, irminAlert]
  );

  /**
   * Saves the active tab as a file.
   */
  const saveActiveTabAsFile = useCallback(async () => {
    if (!currentEditor) return;
    if (currentEditor.created) {
      try {
        // - Save the file using the server action
        const res = await saveEditorItem({
          workspace: workspaceSlug,
          item: {
            name: currentEditor.path.split('/').pop() ?? 'Untitled',
            path: currentEditor.path,
            type: 'file',
            content: currentEditor.contents,
            last_modified: new Date().toISOString(),
          },
        });
        // - Update the editor items state by mapping over the array
        setCurrentEditorItems((prev) =>
          prev.map((file) =>
            file.path === currentEditor.path
              ? {
                  ...file,
                  content: currentEditor.contents,
                  last_modified: new Date().toISOString(),
                }
              : file
          )
        );
        setOpenTabs((prev) =>
          prev.map((tab) =>
            tab.id === currentEditor.id
              ? { ...tab, originalContents: currentEditor.contents }
              : tab
          )
        );
        irminAlert('success', res.message ?? 'File saved successfully');
      } catch (error) {
        irminAlert('error', 'File save failed.');
      }
    } else {
      // - If file is new, show the SaveEditorAsFileModal for a "save as" workflow
      irminModal.show(
        dict.fileNavigator.saveFile,
        <SaveEditorAsFileModal
          defaultName={currentEditor.path.split('/').pop() ?? 'Untitled'}
          defaultPath={currentEditor.path}
          defaultType={currentEditor.language}
          contents={currentEditor.contents}
          editorItems={currentEditorItems}
          createFile={createFile}
        />
      );
    }
  }, [
    workspaceSlug,
    currentEditor,
    currentEditorItems,
    dict.fileNavigator.saveFile,
    createFile,
    irminAlert,
    irminModal,
  ]);

  /**
   * Changes the language of the active tab.
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
          // - Otherwise, just update the language
          return { ...tab, language };
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
            const res = await createEditorFolder({
              workspace: workspaceSlug,
              item: folderItem,
            });
            setCurrentEditorItems((prev) => [...prev, folderItem]);
            irminAlert('success', res.message ?? 'Folder created successfully');
          } catch (error) {
            irminAlert('error', 'Folder creation failed.');
          }
        }}
      />
    );
  }, [
    workspaceSlug,
    currentEditorItems,
    dict.fileNavigator.createFolder,
    irminAlert,
    irminModal,
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
            if (updatedItem.original.path !== updatedItem.current.path) {
              try {
                const res = await moveEditorItem({
                  workspace: workspaceSlug,
                  item: updatedItem.current,
                  destinationPath: updatedItem.current.path,
                });
                setCurrentEditorItems((prev) =>
                  prev.map((f) =>
                    f.path === updatedItem.original!.path
                      ? updatedItem.current!
                      : f
                  )
                );
                irminAlert(
                  'success',
                  res.message ?? 'File updated successfully'
                );
              } catch (error) {
                irminAlert('error', 'File update failed.');
              }
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
              const res = await copyEditorItem({
                workspace: workspaceSlug,
                item: updatedItem.original,
                destinationPath: updatedItem.current.path,
              });
              setCurrentEditorItems((prev) => [...prev, updatedItem.current!]);
              irminAlert('success', res.message ?? 'Item copied successfully');
            } catch (error) {
              irminAlert('error', 'Item copying failed.');
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
          const editorItem = item.original ?? item.current;
          if (!editorItem) return;
          const res = await deleteEditorItem({
            workspace: workspaceSlug,
            item: editorItem,
          });
          // - Update state by filtering out the deleted item
          setCurrentEditorItems((prev) =>
            prev.filter((f) => f.path !== item.current!.path)
          );
          if (editorItem.type === 'file') {
            closeTab(item.current!.path);
          }
          irminAlert('success', res.message ?? `Item deleted successfully`);
        } catch (error) {
          irminAlert('error', 'Deletion failed.');
        }
      });
    },
    [
      workspaceSlug,
      closeTab,
      dict.fileNavigator.deleteConfirmation,
      irminAlert,
      irminConfirm,
    ]
  );

  return {
    items,
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
  };
};
