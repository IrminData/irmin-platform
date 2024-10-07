'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';
import { fetchBucketProxy } from '@/services/proxies/bucket';

import { usePopup } from '@/context/PopupContext';

import { transformBucketToFileNavItem } from '@/utils/bucket';

import { Bucket, BucketFile, BucketFolder } from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import { useIAM } from './IAMContext';

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
  saveFileContents: (file: BucketFile) => void;
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
  const { token } = useIAM();

  const [loading, setLoading] = useState<boolean>(false);

  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [items, setItems] = useState<FileNavigatorItem[]>([]);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);

  const { bucketService } = useMemo(() => new IrminCore(locale), [locale]);

  // Ref to check which workspace the files were fetched for
  const filesFetchedForRef = useRef<string | undefined>();

  /*
   * Fetch files and folders from the current workspace bucket
   */
  const fetchBucket = useCallback(async () => {
    setLoading(true);
    // Fetch bucket data
    try {
      const res = await fetchBucketProxy({
        locale: locale,
        token: token ?? '',
        workspace: currentWorkspace,
      });
      if (!res || !res.data) return;
      const bucketProxyData = res.data;
      // Update the context state
      setCurrentBucket(bucketProxyData.bucket);
      setItems(bucketProxyData.fileNavItems);
    } catch (error) {
      console.error('BucketContext fetchBucket error', error);
      filesFetchedForRef.current = undefined;
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch bucket'
      );
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, locale, token, setCurrentBucket, setItems, irminAlert]);

  /**
   * Update the context state with the bucket data
   * @param bucket - Bucket object
   * @internal
   */
  const updateStateWithBucket = useCallback((bucket: Bucket) => {
    const fileItems = transformBucketToFileNavItem(bucket);
    setCurrentBucket(bucket);
    setItems(fileItems);
  }, []);

  /**
   * Construct the updated bucket for a folder
   *
   * When folder is moved or renamed, the path of the folder and its children need to be updated.
   * This function constructs the updated bucket with the new paths.
   *
   * @param folder - File navigator item
   * @returns Updated bucket
   */
  const constructUpdatedBucketForFolder = useCallback(
    (folder: FileNavigatorItem) => {
      if (!currentBucket) return;
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
    },
    [currentBucket]
  );

  /**
   * Open a new tab in the editor
   * Does not update the bucket or the item list, only the editor tabs
   */
  const openNewTab = useCallback(() => {
    if (!currentBucket) return;
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
  }, [currentBucket, openFileTabs]);

  /**
   * Update file contents in the bucket
   *
   * This function updates the file in the context state and the bucket.
   *
   * @param file - The file to update
   */
  const saveFileContents = useCallback(
    async (file: BucketFile) => {
      try {
        if (!currentBucket) return;
        // Update the context state
        const updatedBucket = { ...currentBucket };
        updatedBucket.files = updatedBucket.files.map((f) =>
          f.path === file.path ? file : f
        );
        updateStateWithBucket(updatedBucket);
        // Update the file in the bucket
        const res = await bucketService.updateFile({
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
    [currentBucket, bucketService, irminAlert, updateStateWithBucket]
  );

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
  const createFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentBucket) return;
        // Update the context state
        const updatedBucket = { ...currentBucket };
        updatedBucket.files.push(file.current as BucketFile);
        updateStateWithBucket(updatedBucket);
        // Create the file in the bucket
        const res = await bucketService.createFile(file);
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
    [currentBucket, bucketService, updateStateWithBucket, irminAlert]
  );

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
  const updateFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentBucket) return;
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
        const res = await bucketService.updateFile(file);
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
    [
      currentBucket,
      updateStateWithBucket,
      bucketService,
      openFileTabs,
      irminAlert,
    ]
  );

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
  const deleteFile = useCallback(
    async (file: FileNavigatorItem) => {
      try {
        if (!currentBucket) return;
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
        const res = await bucketService.deleteFile(file);
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
      currentBucket,
      bucketService,
      updateStateWithBucket,
      openFileTabs,
      activeTab,
      irminAlert,
    ]
  );

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
  const createFolder = useCallback(
    async (folder: FileNavigatorItem) => {
      try {
        if (!currentBucket) return;
        // Update the context state
        const updatedBucket = { ...currentBucket };
        updatedBucket.folders.push(folder.current as BucketFolder);
        updateStateWithBucket(updatedBucket);
        // Create the folder in the bucket
        const res = await bucketService.createFolder(folder);
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
    [currentBucket, bucketService, updateStateWithBucket, irminAlert]
  );

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
  const updateFolder = useCallback(
    async (folder: FileNavigatorItem) => {
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
        const res = await bucketService.updateFolder(folder);
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
      constructUpdatedBucketForFolder,
      updateStateWithBucket,
      bucketService,
      openFileTabs,
      irminAlert,
    ]
  );

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
  const deleteFolder = useCallback(
    async (folder: FileNavigatorItem) => {
      try {
        if (!currentBucket) return;
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
        const res = await bucketService.deleteFolder(folder);
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
      currentBucket,
      updateStateWithBucket,
      openFileTabs,
      activeTab,
      bucketService,
      irminAlert,
    ]
  );

  /**
   * Fetch the bucket when the workspace changes
   */
  useEffect(() => {
    // Don't fetch twice for the same workspace
    if (currentWorkspace === filesFetchedForRef.current) return;
    filesFetchedForRef.current = currentWorkspace;
    // Fetch the bucket
    fetchBucket();
  }, [currentWorkspace, fetchBucket]);

  return (
    <BucketContext.Provider
      value={{
        items,
        bucket: currentBucket,
        loading,
        openNewTab,
        fetchBucket,
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
