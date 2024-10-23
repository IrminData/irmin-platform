'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import {
  createEditorItem,
  deleteEditorItem,
  updateEditorItem,
} from '@/lib/actions/editor-items';

import { usePopup } from '@/context/PopupContext';

import { transformEditorItemsToFileNavItem } from '@/utils/editorItems';

import {
  EditorItems,
  EditorItemsFile,
  EditorItemsFolder,
} from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * EditorItems context properties
 *
 * @typeParam items - Editor files and folders in the workspace
 * @typeParam createFile - Create a new file
 * @typeParam updateFile - Update a file
 * @typeParam deleteFile - Delete a file
 * @typeParam createFolder - Create a new folder
 * @typeParam updateFolder - Update a folder
 * @typeParam deleteFolder - Delete a folder
 * @typeParam openFileTabs - Paths of the items open in the editor
 * @typeParam setOpenFileTabs - Set the paths of the items open in the editor
 * @typeParam activeTab - Active tab index
 * @typeParam setActiveTab - Set the active tab index
 */
interface EditorItemsContextProps {
  items: FileNavigatorItem[];
  editorItems: EditorItems | null;
  openNewTab: () => void;
  saveFileContents: (file: EditorItemsFile) => void;
  createFile: (file: FileNavigatorItem) => void;
  updateFile: (file: FileNavigatorItem) => void;
  deleteFile: (file: FileNavigatorItem) => void;
  createFolder: (folder: FileNavigatorItem) => void;
  updateFolder: (folder: FileNavigatorItem) => void;
  deleteFolder: (folder: FileNavigatorItem) => void;
  openFileTabs: string[];
  setOpenFileTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTab: number;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
}

const EditorItemsContext = createContext<EditorItemsContextProps | undefined>(
  undefined
);

/**
 * EditorItems context to provide editor items data to components like the file navigator
 *
 * @param config - EditorItems context provider configuration
 * @param config.editorItems - Current editor items
 * @param config.children - Child components
 *
 * @returns EditorItems context provider
 */
export const EditorItemsProvider = ({
  editorItems,
  children,
}: {
  editorItems: EditorItems;
  children: React.ReactNode;
}) => {
  const { irminAlert } = usePopup();

  const [currentEditorItems, setCurrentEditorItems] =
    useState<EditorItems>(editorItems);
  const [items, setItems] = useState<FileNavigatorItem[]>([]);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);

  /**
   * Update the context state with the editorItems
   * @param editorItems - EditorItems object
   * @internal
   */
  const updateStateWithEditorItems = useCallback((editorItems: EditorItems) => {
    const fileItems = transformEditorItemsToFileNavItem(editorItems);
    setCurrentEditorItems(editorItems);
    setItems(fileItems);
  }, []);

  /**
   * Construct the updated editorItems for a folder
   *
   * When folder is moved or renamed, the path of the folder and its children need to be updated.
   * This function constructs the updated editorItems with the new paths.
   *
   * @param folder - File navigator item
   * @returns Updated editorItems
   */
  const constructUpdatedEditorItemsForFolder = useCallback(
    (folder: FileNavigatorItem) => {
      if (!currentEditorItems) return;
      // Construct the updated editorItems
      const updatedEditorItems = { ...currentEditorItems };
      updatedEditorItems.folders = updatedEditorItems.folders?.map((f) => {
        // Update the folder item
        if (f.path === folder.original?.path) {
          return folder.current as EditorItemsFolder;
        }
        // Update children of the folder to reflect the path change
        if (folder.original?.path && f.path?.startsWith(folder.original.path)) {
          const newPath = f.path.replace(
            folder.original?.path ?? '',
            folder.current?.path ?? ''
          );
          return f.path === newPath ? f : { ...f, path: newPath };
        }
        return f;
      });
      // Update the files to reflect the path change
      updatedEditorItems.files = updatedEditorItems.files?.map((f) => {
        if (f.path?.startsWith(folder.original?.path ?? '')) {
          const newPath = f.path.replace(
            folder.original?.path ?? '',
            folder.current?.path ?? ''
          );
          return f.path === newPath ? f : { ...f, path: newPath };
        }
        return f;
      });
      // Return the updated editorItems
      return updatedEditorItems;
    },
    [currentEditorItems]
  );

  /**
   * Open a new tab in the editor
   * Does not update the editorItems or the item list, only the editor tabs
   */
  const openNewTab = useCallback(() => {
    if (!currentEditorItems) return;
    // Create a new tab with a random file name and switch to it
    const prevOpenFileTabs = [...openFileTabs];
    setOpenFileTabs([
      ...prevOpenFileTabs,
      `/${Math.random().toString(36).substring(7)}.sql`,
    ]);
    setActiveTab(prevOpenFileTabs.length);

    // Create a new untitled file and make sure it's unique
    const untitledFiles =
      currentEditorItems.files.filter((file) =>
        file.name.toLowerCase().includes('untitled')
      ) ?? [];
    const untitledTabs = openFileTabs.filter((path) =>
      path.toLowerCase().includes('untitled')
    );
    const untitledCount = untitledFiles.length + untitledTabs.length;
    const untitledName = `untitled_${untitledCount + 1}.sql`;
    const untitledPath = `/${untitledName}`;

    // Update the newly created tab with the untitled file path
    setOpenFileTabs([...prevOpenFileTabs, untitledPath]);
  }, [currentEditorItems, openFileTabs]);

  /**
   * Update file contents
   *
   * This function updates the file in the context state and the editorItems.
   *
   * @param file - The file to update
   */
  const saveFileContents = useCallback(
    async (file: EditorItemsFile) => {
      try {
        if (!currentEditorItems) return;
        // Update the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.files = updatedEditorItems.files.map((f) =>
          f.path === file.path ? file : f
        );
        updateStateWithEditorItems(updatedEditorItems);
        // Update the file
        const res = await updateEditorItem({
          original: file,
          current: file,
          type: 'file',
        });
        // Show success alert
        irminAlert('success', res.message ?? 'File updated');
      } catch (error) {
        console.error('Update file contents error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to update file contents'
        );
      }
    },
    [currentEditorItems, irminAlert, updateStateWithEditorItems]
  );

  /**
   * Create a new file
   *
   * @remarks
   *
   * Create the file in the context state
   * Create the file
   *
   * @param file - File navigator item
   */
  const createFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentEditorItems) return;
        // Update the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.files.push(file.current as EditorItemsFile);
        updateStateWithEditorItems(updatedEditorItems);
        // Create the file
        const res = await createEditorItem(file);
        // Show success alert
        irminAlert('success', res.message ?? 'File updated');
      } catch (error) {
        console.error('Create file error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create file'
        );
      }
    },
    [currentEditorItems, updateStateWithEditorItems, irminAlert]
  );

  /**
   * Update a file
   *
   * @remarks
   *
   * Update the file in the context state
   * Update the open file tabs
   * Update the file
   *
   * @param file - File navigator item
   */
  const updateFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentEditorItems) return;
        // Update the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.files = updatedEditorItems.files.map((f) =>
          f.path === file.original?.path ? (file.current as EditorItemsFile) : f
        );
        updateStateWithEditorItems(updatedEditorItems);
        // Update the open file tabs
        setOpenFileTabs(
          openFileTabs.map((path) =>
            path === file.original?.path ? (file.current?.path ?? '') : path
          )
        );
        // Update the file
        const res = await updateEditorItem(file);
        // Show success alert
        irminAlert('success', res.message ?? 'File updated');
      } catch (error) {
        console.error('Update file error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to update file'
        );
      }
    },
    [currentEditorItems, updateStateWithEditorItems, openFileTabs, irminAlert]
  );

  /**
   * Delete a file
   *
   * @remarks
   *
   * Remember to confirm the deletion before proceeding
   *
   * Delete the file from the context state
   * Update the open file tabs
   * Delete the file
   *
   * @param file - File navigator item
   */
  const deleteFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentEditorItems) return;
        // Update the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.files = updatedEditorItems.files.filter(
          (f) => f.path !== file.current?.path
        );
        updateStateWithEditorItems(updatedEditorItems);
        // Update the open file tabs
        if (openFileTabs[activeTab] === file.current?.path) setActiveTab(0);
        setOpenFileTabs(
          openFileTabs.filter((path) => path !== file.current?.path)
        );
        // Delete the file
        const res = await deleteEditorItem(file);
        // Show success alert
        irminAlert('success', res.message ?? 'File deleted');
      } catch (error) {
        console.error('Delete file error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete file'
        );
      }
    },
    [
      currentEditorItems,
      updateStateWithEditorItems,
      openFileTabs,
      activeTab,
      irminAlert,
    ]
  );

  /**
   * Create a new folder
   *
   * @remarks
   *
   * Create the folder in the context state
   * Create the folder
   *
   * @param folder - File navigator item
   */
  const createFolder = useCallback(
    async (folder: FileNavigatorItem) => {
      try {
        if (!currentEditorItems) return;
        // Update the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.folders.push(folder.current as EditorItemsFolder);
        updateStateWithEditorItems(updatedEditorItems);
        // Create the folder
        const res = await createEditorItem(folder);
        // Show success alert
        irminAlert('success', res.message ?? 'Folder created');
      } catch (error) {
        console.error('Create folder error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create folder'
        );
      }
    },
    [currentEditorItems, updateStateWithEditorItems, irminAlert]
  );

  /**
   * Update a folder
   *
   * @remarks
   *
   * Update the folder in the context state
   * Update the open file tabs
   * Update the folder
   *
   * @param folder - File navigator item
   */
  const updateFolder = useCallback(
    async (folder: FileNavigatorItem) => {
      try {
        // Construct the updated editorItems
        const updatedEditorItems = constructUpdatedEditorItemsForFolder(folder);
        if (!updatedEditorItems)
          throw new Error('EditorItems failed to construct for folder');
        // Update the context state
        updateStateWithEditorItems(updatedEditorItems);
        // Update the open file tabs
        setOpenFileTabs(
          openFileTabs.map((path) =>
            path?.startsWith(folder.original?.path ?? '')
              ? path.replace(
                  folder.original?.path ?? '',
                  folder.current?.path ?? ''
                )
              : path
          )
        );
        // Update the folder
        const res = await updateEditorItem(folder);
        // Show success alert
        irminAlert('success', res.message ?? 'Folder updated');
      } catch (error) {
        console.error('Update folder error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to update folder'
        );
      }
    },
    [
      constructUpdatedEditorItemsForFolder,
      updateStateWithEditorItems,
      openFileTabs,
      irminAlert,
    ]
  );

  /**
   * Delete a folder
   *
   * @remarks
   *
   * Remember to confirm the deletion before proceeding
   *
   * Delete the folder and all of it's children from the context state
   * Update the open file tabs
   * Delete the folder
   *
   * @param folder - File navigator item
   */
  const deleteFolder = useCallback(
    async (folder: FileNavigatorItem) => {
      try {
        if (!currentEditorItems) return;
        // Remove the folder and its children from the context state
        const updatedEditorItems = { ...currentEditorItems };
        updatedEditorItems.folders = updatedEditorItems.folders.filter(
          (f) => !f.path?.startsWith(folder.original?.path ?? '')
        );
        updatedEditorItems.files = updatedEditorItems.files.filter(
          (f) => !f.path?.startsWith(folder.original?.path ?? '')
        );
        updateStateWithEditorItems(updatedEditorItems);
        // Update the open file tabs
        if (openFileTabs[activeTab]?.startsWith(folder.original?.path ?? '')) {
          setActiveTab(0);
        }
        setOpenFileTabs(
          openFileTabs.filter(
            (path) => !path?.startsWith(folder.original?.path ?? '')
          )
        );
        // Delete the folder
        const res = await deleteEditorItem(folder);
        // Show success alert
        irminAlert('success', res.message ?? 'Folder deleted');
      } catch (error) {
        console.error('Delete folder error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete folder'
        );
      }
    },
    [
      currentEditorItems,
      updateStateWithEditorItems,
      openFileTabs,
      activeTab,
      irminAlert,
    ]
  );

  return (
    <EditorItemsContext.Provider
      value={{
        items,
        editorItems: currentEditorItems,
        openNewTab,
        saveFileContents,
        createFile,
        updateFile,
        deleteFile,
        createFolder,
        updateFolder,
        deleteFolder,
        openFileTabs,
        setOpenFileTabs,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </EditorItemsContext.Provider>
  );
};

/**
 * Hook to use the editor items context
 */
export const useEditorItems = () => {
  const context = useContext(EditorItemsContext);
  if (!context) {
    throw new Error('useEditorItems must be used within a EditorItemsProvider');
  }
  return context;
};
