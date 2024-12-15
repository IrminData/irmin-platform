import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  createEditorItem,
  deleteEditorItem,
  updateEditorItem,
} from '@/lib/actions/editor-items';

import AddNewFileModal from '@/components/editor/modals/AddNewFileModal';
import AddNewFolderModal from '@/components/editor/modals/AddNewFolderModal';
import RenameOrMoveItemModal from '@/components/editor/modals/RenameOrMoveItemModal';
import SaveEditorAsFileModal from '@/components/editor/modals/SaveEditorAsFileModal';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getFileByPath,
  getLanguageFromFilename,
  transformEditorItemsToFileNavItem,
} from '@/utils/editorItems';

import {
  EditorItems,
  EditorItemsFile,
  IrminFileType,
} from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Hook to manage editor items and editor state.
 *
 * @param editorItems - Current editor items.
 */
export const useEditor = (editorItems: EditorItems) => {
  const { dict } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { irminModal, irminAlert, irminConfirm } = usePopup();

  // State for editor items
  const [currentEditorItems, setCurrentEditorItems] = useState(editorItems);

  // Update currentEditorItems if editorItems prop changes
  useEffect(() => {
    setCurrentEditorItems(editorItems);
  }, [editorItems]);

  // Transformed items for the file navigator
  const items = useMemo(
    () => transformEditorItemsToFileNavItem(currentEditorItems),
    [currentEditorItems]
  );

  // State for open tabs and active tab index
  const [openTabs, setOpenTabs] = useState<
    {
      id: string;
      path: string;
      contents: string;
      originalContents: string;
      language: IrminFileType;
      created: boolean;
    }[]
  >([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editorHeight, setEditorHeight] = useState('600px');
  const [untitledCounter, setUntitledCounter] = useState(1);

  // Get the current editor based on active tab
  const currentEditor = openTabs[activeTabIndex];

  /**
   * Opens a new tab with an untitled file name.
   */
  const openNewTab = useCallback(() => {
    const untitledName = `untitled_${untitledCounter}.sql`;
    const untitledPath = `/${untitledName}`;

    const newTab = {
      id: crypto.randomUUID(),
      path: untitledPath,
      contents: '',
      originalContents: '',
      language: 'sql' as IrminFileType,
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
   */
  const openFile = useCallback(
    (file: FileNavigatorItem) => {
      const filePath = file.current?.path ?? '';
      const existingTabIndex = openTabs.findIndex(
        (tab) => tab.path === filePath
      );

      if (existingTabIndex === -1) {
        const currentAsFile = file.current as EditorItemsFile | null;
        const fileContents = currentAsFile?.contents ?? '';
        const language =
          currentAsFile?.type ?? getLanguageFromFilename(filePath);

        const newTab = {
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
    [openTabs]
  );

  /**
   * Hook to set initial open tabs using searchParams.
   */
  const setInitialOpenTabs = useRef(false);
  useEffect(() => {
    if (setInitialOpenTabs.current) return;
    const paths = searchParams.getAll('path');
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (!path) continue;
      if (openTabs.some((tab) => tab.path === path)) continue;
      const editorItem = getFileByPath(path, currentEditorItems);
      if (!editorItem) continue;
      openFile({ type: 'file', current: editorItem, original: editorItem });
    }
    setInitialOpenTabs.current = true;
  }, [searchParams, currentEditorItems, openTabs, openFile]);

  /**
   * Closes a tab.
   */
  const closeTab = useCallback(
    (tabPath: string) => {
      const tabIndex = openTabs.findIndex((tab) => tab.path === tabPath);
      if (tabIndex !== -1) {
        setOpenTabs((prev) => prev.filter((tab) => tab.path !== tabPath));

        // Adjust activeTabIndex if necessary
        if (activeTabIndex >= tabIndex) {
          setActiveTabIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        }

        // Update the URL by removing the path from searchParams
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('path', tabPath);
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
    },
    [activeTabIndex, searchParams, openTabs, router, pathname]
  );

  /**
   * Updates the content of the current tab.
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
   */
  const createFile = useCallback(
    async (fileItem: FileNavigatorItem) => {
      if (fileItem.type !== 'file' || !fileItem.current) return;

      const res = await createEditorItem(fileItem);
      setCurrentEditorItems((prev) => ({
        ...prev,
        files: [...prev.files, fileItem.current as EditorItemsFile],
      }));
      irminAlert('success', res.message ?? 'File created successfully');
    },
    [irminAlert]
  );

  /**
   * Saves the active tab as a file.
   */
  const saveActiveTabAsFile = useCallback(async () => {
    if (!currentEditor) return;

    if (currentEditor.created) {
      const file = getFileByPath(currentEditor.path, currentEditorItems);

      if (!file) {
        // Provide feedback if no file is found
        irminAlert(
          'error',
          'Could not find the file to save. Please try again.'
        );
        return;
      }

      const updatedFile = { ...file, contents: currentEditor.contents };
      const res = await updateEditorItem({
        original: file,
        current: updatedFile,
        type: 'file',
      });

      if (!res || res.errors) {
        // Handle update error
        irminAlert(
          'error',
          res?.message ?? 'File could not be saved. Please try again.'
        );
        return;
      }

      setCurrentEditorItems((prev) => ({
        ...prev,
        files: prev.files.map((f) => (f.path === file.path ? updatedFile : f)),
      }));

      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === currentEditor.id
            ? { ...tab, originalContents: currentEditor.contents }
            : tab
        )
      );

      irminAlert('success', res.message ?? 'File saved successfully');
    } else {
      // Unsaved file: show the "save as" modal
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
    currentEditor,
    currentEditorItems,
    createFile,
    dict.fileNavigator.saveFile,
    irminAlert,
    irminModal,
  ]);

  /**
   * Changes the language of the active tab.
   */
  const changeLanguage = useCallback(
    (language: IrminFileType) => {
      if (!currentEditor) return;

      setOpenTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== currentEditor.id) return tab;

          // If the file is not created (unsaved), replace its extension
          if (!tab.created) {
            const newPath = tab.path.replace(/\.\w+$/, `.${language}`);
            return { ...tab, language, path: newPath };
          }

          // If the file is already created, just update the language and do NOT rename the path
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
        createFolder={async (folderItem) => {
          if (folderItem.type !== 'folder' || !folderItem.current) return;
          const res = await createEditorItem(folderItem);
          setCurrentEditorItems((prev) => ({
            ...prev,
            folders: [...prev.folders, folderItem.current as EditorItemsFile],
          }));
          irminAlert('success', res.message ?? 'Folder created successfully');
        }}
      />
    );
  }, [
    currentEditorItems,
    dict.fileNavigator.createFolder,
    irminAlert,
    irminModal,
  ]);

  /**
   * Renames or moves an item via modal.
   */
  const renameOrMoveItem = useCallback(
    (item: FileNavigatorItem) => {
      if (!item.current) return;

      irminModal.show(
        item.type === 'file'
          ? dict.fileNavigator.updateFile
          : dict.fileNavigator.updateFolder,
        <RenameOrMoveItemModal
          item={item}
          editorItems={currentEditorItems}
          updateFile={async (updatedItem) => {
            if (
              updatedItem.type !== 'file' ||
              !updatedItem.original ||
              !updatedItem.current
            )
              return;

            const res = await updateEditorItem(updatedItem);
            setCurrentEditorItems((prev) => ({
              ...prev,
              files: prev.files.map((f) =>
                f.path === updatedItem.original!.path
                  ? (updatedItem.current as EditorItemsFile)
                  : f
              ),
            }));
            irminAlert('success', res.message ?? 'File updated successfully');
          }}
          updateFolder={async (updatedItem) => {
            if (
              updatedItem.type !== 'folder' ||
              !updatedItem.original ||
              !updatedItem.current
            )
              return;

            const res = await updateEditorItem(updatedItem);
            setCurrentEditorItems((prev) => ({
              ...prev,
              folders: prev.folders.map((f) =>
                f.path === updatedItem.original!.path
                  ? (updatedItem.current as EditorItemsFile)
                  : f
              ),
            }));
            irminAlert('success', res.message ?? 'Folder updated successfully');
          }}
        />
      );
    },
    [currentEditorItems, dict.fileNavigator, irminAlert, irminModal]
  );

  /**
   * Deletes an item with confirmation.
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

        if (item.type === 'file') {
          const res = await deleteEditorItem(item);
          setCurrentEditorItems((prev) => ({
            ...prev,
            files: prev.files.filter((f) => f.path !== item.current!.path),
          }));
          closeTab(item.current!.path);
          irminAlert('success', res.message ?? 'File deleted successfully');
        } else {
          const res = await deleteEditorItem(item);
          setCurrentEditorItems((prev) => ({
            ...prev,
            folders: prev.folders.filter((f) => f.path !== item.current!.path),
          }));
          irminAlert('success', res.message ?? 'Folder deleted successfully');
        }
      });
    },
    [closeTab, dict.fileNavigator.deleteConfirmation, irminAlert, irminConfirm]
  );

  return {
    items,
    addNewFile,
    addNewFolder,
    renameOrMoveItem,
    deleteItem,
    openFile,
    currentEditor,
    openFileTabs: openTabs.map((tab) => tab.path),
    activeTab: activeTabIndex,
    updateCurrentTabContent,
    setEditorHeight,
    setActiveTab: setActiveTabIndex,
    saveActiveTabAsFile,
    closeTab,
    changeLanguage,
    openNewTab,
    editorHeight,
    enableSaveButton,
  };
};
