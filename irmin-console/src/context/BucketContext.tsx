'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Locale } from '@/dictionaries';
import BucketService from '@/services/api/BucketService';

import { usePopup } from '@/context/PopupContext';

import { transformBucketToFileNavItem } from '@/utils/bucket';

import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Bucket context properties
 *
 * @typeParam items - Files and folders in the bucket
 * @typeParam loading - Loading state of the bucket
 * @typeParam fetchBucket - Fetch the bucket, items and folders
 * @typeParam createFile - Create a new file in the bucket
 * @typeParam updateFile - Update a file in the bucket
 * @typeParam deleteFile - Delete a file from the bucket
 * @typeParam createFolder - Create a new folder in the bucket
 * @typeParam updateFolder - Update a folder in the bucket
 * @typeParam deleteFolder - Delete a folder from the bucket
 * @typeParam openFileTabs - Paths of the items open in the editor
 * @typeParam setOpenFileTabs - Set the paths of the items open in the editor
 * @typeParam activeTab - Active tab index
 * @typeParam setActiveTab - Set the active tab index
 */
interface BucketContextProps {
  items: FileNavigatorItem[];
  bucket: Bucket | null;
  loading: boolean;
  openNewTab: () => void;
  fetchBucket: () => void;
  updateFileContents: (file: BucketFile) => void;
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

const BucketContext = createContext<BucketContextProps | undefined>(undefined);

/**
 * Bucket context to provide bucket data to components like the file navigator
 *
 * @param config - Bucket context provider configuration
 * @param config.locale - Locale object
 * @param config.currentWorkspace - Current workspace ID
 * @param config.children - Child components
 *
 * @returns Bucket context provider
 */
export const BucketProvider = ({
  locale,
  currentWorkspace,
  children,
}: {
  locale: Locale;
  currentWorkspace: string;
  children: React.ReactNode;
}) => {
  const { irminAlert } = usePopup();

  const [filesFetechedForWorkspace, setFilesFetechedForWorkspace] =
    useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [items, setItems] = useState<FileNavigatorItem[]>([]);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);

  const bucketService = BucketService.getInstance(locale);

  /*
   * Fetch files and folders from the current workspace bucket
   */
  const fetchBucket = useCallback(async () => {
    try {
      // Skip if already loading
      if (loading) return;
      setLoading(true);
      setFilesFetechedForWorkspace(currentWorkspace);
      // Fetch bucket data
      const response = await bucketService.fetchBucket();
      if (!response || !response.data) return;
      const bucket = response.data;
      // Transform bucket to file items
      const fileItems = transformBucketToFileNavItem(bucket);
      // Update the context state
      setCurrentBucket(bucket);
      setItems(fileItems);
    } catch (error) {
      console.error('BucketContext fetchFiles error', error);
      setFilesFetechedForWorkspace('');
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch bucket'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, bucketService, currentWorkspace, irminAlert]);

  /**
   * Hook to fetch the bucket when the workspace changes
   */
  useEffect(() => {
    // Fetch items if workspace changes
    if (currentWorkspace !== filesFetechedForWorkspace) {
      fetchBucket();
    }
  }, [currentWorkspace, filesFetechedForWorkspace, fetchBucket]);

  /**
   * Update the context state with the bucket data
   * @param bucket - Bucket object
   * @internal
   */
  const updateStateWithBucket = (bucket: Bucket) => {
    const fileItems = transformBucketToFileNavItem(bucket);
    setCurrentBucket(bucket);
    setItems(fileItems);
  };

  /**
   * Construct the updated bucket for a folder
   *
   * @remarks
   *
   * When folder is moved or renamed, the path of the folder and its children need to be updated.
   * This function constructs the updated bucket with the new paths.
   *
   * @param folder - File navigator item
   * @returns Updated bucket
   */
  const constructUpdatedBucketForFolder = (folder: FileNavigatorItem) => {
    if (!currentBucket) throw new Error('Bucket not found');
    // Construct the updated bucket
    const updatedBucket = { ...currentBucket };
    updatedBucket.folders = updatedBucket.folders?.map((f) => {
      // Update the folder item in the bucket
      if (f.path === folder.original?.path) {
        return folder.current as BucketFolder;
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
    // Update the files in the bucket to reflect the path change
    updatedBucket.files = updatedBucket.files?.map((f) => {
      if (f.path?.startsWith(folder.original?.path ?? '')) {
        const newPath = f.path.replace(
          folder.original?.path ?? '',
          folder.current?.path ?? ''
        );
        return f.path === newPath ? f : { ...f, path: newPath };
      }
      return f;
    });
    // Return the updated bucket
    return updatedBucket;
  };

  /**
   * Open a new tab in the editor
   * Does not update the bucket or the item list, only the editor tabs
   */
  const openNewTab = () => {
    if (!currentBucket) throw new Error('Bucket not found');
    // Create a new tab with a random file name and switch to it
    const prevOpenFileTabs = [...openFileTabs];
    setOpenFileTabs([
      ...prevOpenFileTabs,
      `/${Math.random().toString(36).substring(7)}.sql`,
    ]);
    setActiveTab(prevOpenFileTabs.length);

    // Create a new untitled file and make sure it's unique
    const untitledFiles =
      currentBucket.files.filter((file) =>
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
  };

  /**
   * Update file contents, documentation etc.
   *
   * @remarks
   *
   * When user updates the file contents, documentation etc in the editor,
   * this function is called to update the file in the bucket.
   *
   * This function updates the file in the context state and the bucket.
   *
   * @param file - The file to update
   */
  const updateFileContents = async (file: BucketFile) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Update the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.files = updatedBucket.files.map((f) =>
        f.path === file.path ? file : f
      );
      updateStateWithBucket(updatedBucket);
      // Update the file in the bucket
      const response = await bucketService.updateFile({
        original: file,
        current: file,
        type: 'file',
      });
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'File updated'
      );
    } catch (error) {
      console.error('Update file contents error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to update file contents'
      );
    }
  };

  /**
   * Create a new file in the bucket
   *
   * @remarks
   *
   * Create the file in the context state
   * Create the file in the bucket
   *
   * @param file - File navigator item
   */
  const createFile = async (file: FileNavigatorItem) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Update the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.files.push(file.current as BucketFile);
      updateStateWithBucket(updatedBucket);
      // Create the file in the bucket
      const response = await bucketService.createFile(file);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'File updated'
      );
    } catch (error) {
      console.error('Create file error:', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to create file');
    }
  };

  /**
   * Update a file in the bucket
   *
   * @remarks
   *
   * Update the file in the context state
   * Update the open file tabs
   * Update the file in the bucket
   *
   * @param file - File navigator item
   */
  const updateFile = async (file: FileNavigatorItem) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Update the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.files = updatedBucket.files.map((f) =>
        f.path === file.original?.path ? (file.current as BucketFile) : f
      );
      updateStateWithBucket(updatedBucket);
      // Update the open file tabs
      setOpenFileTabs(
        openFileTabs.map((path) =>
          path === file.original?.path ? (file.current?.path ?? '') : path
        )
      );
      // Update the file in the bucket
      const response = await bucketService.updateFile(file);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'File updated'
      );
    } catch (error) {
      console.error('Update file error:', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to update file');
    }
  };

  /**
   * Delete a file from the bucket
   *
   * @remarks
   *
   * Remember to confirm the deletion before proceeding
   *
   * Delete the file from the context state
   * Update the open file tabs
   * Delete the file from the bucket
   *
   * @param file - File navigator item
   */
  const deleteFile = async (file: FileNavigatorItem) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Update the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.files = updatedBucket.files.filter(
        (f) => f.path !== file.current?.path
      );
      updateStateWithBucket(updatedBucket);
      // Update the open file tabs
      if (openFileTabs[activeTab] === file.current?.path) setActiveTab(0);
      setOpenFileTabs(
        openFileTabs.filter((path) => path !== file.current?.path)
      );
      // Delete the file from the bucket
      const response = await bucketService.deleteFile(file);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'File deleted'
      );
    } catch (error) {
      console.error('Delete file error:', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to delete file');
    }
  };

  /**
   * Create a new folder in the bucket
   *
   * @remarks
   *
   * Create the folder in the context state
   * Create the folder in the bucket
   *
   * @param folder - File navigator item
   */
  const createFolder = async (folder: FileNavigatorItem) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Update the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.folders.push(folder.current as BucketFolder);
      updateStateWithBucket(updatedBucket);
      // Create the folder in the bucket
      const response = await bucketService.createFolder(folder);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'Folder created'
      );
    } catch (error) {
      console.error('Create folder error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to create folder'
      );
    }
  };

  /**
   * Update a folder in the bucket
   *
   * @remarks
   *
   * Update the folder in the context state
   * Update the open file tabs
   * Update the folder in the bucket
   *
   * @param folder - File navigator item
   */
  const updateFolder = async (folder: FileNavigatorItem) => {
    try {
      // Construct the updated bucket
      const updatedBucket = constructUpdatedBucketForFolder(folder);
      if (!updatedBucket)
        throw new Error('Bucket failed to construct for folder');
      // Update the context state
      updateStateWithBucket(updatedBucket);
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
      // Update the folder in the bucket
      const response = await bucketService.updateFolder(folder);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'Folder updated'
      );
    } catch (error) {
      console.error('Update folder error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to update folder'
      );
    }
  };

  /**
   * Delete a folder from the bucket
   *
   * @remarks
   *
   * Remember to confirm the deletion before proceeding
   *
   * Delete the folder and all of it's children from the context state
   * Update the open file tabs
   * Delete the folder from the bucket
   *
   * @param folder - File navigator item
   */
  const deleteFolder = async (folder: FileNavigatorItem) => {
    try {
      if (!currentBucket) throw new Error('Bucket not found');
      // Remove the folder and its children from the context state
      const updatedBucket = { ...currentBucket };
      updatedBucket.folders = updatedBucket.folders.filter(
        (f) => !f.path?.startsWith(folder.original?.path ?? '')
      );
      updatedBucket.files = updatedBucket.files.filter(
        (f) => !f.path?.startsWith(folder.original?.path ?? '')
      );
      updateStateWithBucket(updatedBucket);
      // Update the open file tabs
      if (openFileTabs[activeTab]?.startsWith(folder.original?.path ?? '')) {
        setActiveTab(0);
      }
      setOpenFileTabs(
        openFileTabs.filter(
          (path) => !path?.startsWith(folder.original?.path ?? '')
        )
      );
      // Delete the folder from the bucket
      const response = await bucketService.deleteFolder(folder);
      // Show success alert
      irminAlert(
        'success',
        response.metadata?.message ?? response.message ?? 'Folder deleted'
      );
    } catch (error) {
      console.error('Delete folder error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to delete folder'
      );
    }
  };

  return (
    <BucketContext.Provider
      value={{
        items,
        bucket: currentBucket,
        loading,
        openNewTab,
        fetchBucket,
        updateFileContents,
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
    </BucketContext.Provider>
  );
};

/**
 * Hook to use the bucket context
 */
export const useBucket = () => {
  const context = useContext(BucketContext);
  if (!context) {
    throw new Error('useBucket must be used within a BucketProvider');
  }
  return context;
};
