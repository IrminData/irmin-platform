import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { FileContents } from '@/types/internal/FileContents';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Hook to manage editor items and editor state
 *
 * @param editorItems - Current editor items
 */
export const useEditor = (editorItems: EditorItems) => {
  const { dict } = useLocale();
  const { irminModal, irminAlert, irminConfirm } = usePopup();

  // State for editor items
  const [currentEditorItems, setCurrentEditorItems] =
    useState<EditorItems>(editorItems);

  // Update currentEditorItems if editorItems prop changes
  useEffect(() => {
    setCurrentEditorItems(editorItems);
  }, [editorItems]);

  // Transformed items for the file navigator
  const items = useMemo(
    () => transformEditorItemsToFileNavItem(currentEditorItems),
    [currentEditorItems]
  );

  // State for editor tabs and contents
  const [activeTab, setActiveTab] = useState(0);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [openTabsContents, setOpenTabsContents] = useState<FileContents[]>([]);
  const [editorHeight, setEditorHeight] = useState('500px');

  /**
   * Opens a new tab with an untitled file name
   */
  const openNewTab = useCallback(() => {
    const untitledCount = openFileTabs.filter((path) =>
      path.toLowerCase().includes('untitled')
    ).length;
    const untitledName = `untitled_${untitledCount + 1}.sql`;
    const untitledPath = `/${untitledName}`;

    setOpenFileTabs((prev) => [...prev, untitledPath]);
    setActiveTab(openFileTabs.length);
  }, [openFileTabs]);

  /**
   * Opens a file in a new tab
   */
  const openFile = useCallback(
    (file: FileNavigatorItem) => {
      const filePath = file.current?.path ?? '';
      const existingTabIndex = openFileTabs.indexOf(filePath);

      if (existingTabIndex === -1) {
        setOpenFileTabs((prev) => [...prev, filePath]);
        setActiveTab(openFileTabs.length);
      } else {
        setActiveTab(existingTabIndex);
      }
    },
    [openFileTabs]
  );

  /**
   * Closes a tab
   */
  const closeTab = useCallback(
    (tabPath: string) => {
      setOpenFileTabs((prev) => prev.filter((path) => path !== tabPath));
      setOpenTabsContents((prev) =>
        prev.filter((content) => content.path !== tabPath)
      );

      if (activeTab >= openFileTabs.length - 1) {
        setActiveTab(
          openFileTabs.length - 2 >= 0 ? openFileTabs.length - 2 : 0
        );
      }
    },
    [activeTab, openFileTabs.length]
  );

  /**
   * Updates the content of the current tab
   */
  const updateCurrentTabContent = useCallback(
    (newContent: string) => {
      const currentTabPath = openFileTabs[activeTab];
      setOpenTabsContents((prev) =>
        prev.map((content) =>
          content.path === currentTabPath
            ? { ...content, contents: newContent }
            : content
        )
      );
    },
    [activeTab, openFileTabs]
  );

  /**
   * Initializes or updates open tabs contents
   */
  useEffect(() => {
    const updatedContents = openFileTabs.map((tabPath) => {
      const existingContent = openTabsContents.find(
        (content) => content.path === tabPath
      );
      if (existingContent) return existingContent;

      const file = getFileByPath(tabPath, currentEditorItems);
      const contents = file?.contents ?? '';
      const language = file?.type ?? getLanguageFromFilename(tabPath);

      return {
        id: crypto.randomUUID(),
        contents,
        originalContents: contents,
        language,
        path: tabPath,
        created: !!file,
      };
    });

    setOpenTabsContents(updatedContents);
  }, [openFileTabs, currentEditorItems, openTabsContents]);

  /**
   * Retrieves the current editor content based on the active tab
   */
  const currentEditor = useMemo(
    () => openTabsContents.find((tab) => tab.path === openFileTabs[activeTab]),
    [openTabsContents, openFileTabs, activeTab]
  );

  /**
   * Determines if the save button should be enabled
   */
  const enableSaveButton = useMemo(() => {
    if (!currentEditor) return false;
    return currentEditor.contents !== currentEditor.originalContents;
  }, [currentEditor]);

  /**
   * Create a new file
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
   * Save the active tab as a file
   */
  const saveActiveTabAsFile = useCallback(async () => {
    if (!currentEditor) return;

    if (currentEditor.created) {
      const file = getFileByPath(currentEditor.path, currentEditorItems);
      if (!file) return;

      const updatedFile = { ...file, contents: currentEditor.contents };
      const res = await updateEditorItem({
        original: file,
        current: updatedFile,
        type: 'file',
      });
      setCurrentEditorItems((prev) => ({
        ...prev,
        files: prev.files.map((f) => (f.path === file.path ? updatedFile : f)),
      }));

      setOpenTabsContents((prev) =>
        prev.map((content) =>
          content.path === currentEditor.path
            ? { ...content, originalContents: currentEditor.contents }
            : content
        )
      );

      irminAlert('success', res.message ?? 'File saved successfully');
    } else {
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
   * Change the language of the active tab
   */
  const changeLanguage = useCallback(
    (language: IrminFileType) => {
      if (!currentEditor) return;
      setOpenTabsContents((prev) =>
        prev.map((content) =>
          content.id === currentEditor.id ? { ...content, language } : content
        )
      );
    },
    [currentEditor]
  );

  /**
   * Add new file via modal
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
   * Add new folder via modal
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
   * Rename or move item via modal
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
   * Delete item with confirmation
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
    openFileTabs,
    activeTab,
    updateCurrentTabContent,
    setEditorHeight,
    setActiveTab,
    saveActiveTabAsFile,
    closeTab,
    changeLanguage,
    openNewTab,
    editorHeight,
    enableSaveButton,
  };
};
