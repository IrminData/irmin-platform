'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { clientEnv } from '@/config/env.client';

import { useIrminCore } from '@/context/IrminCoreContext';

import { generateTempId } from '@/utils/generateTempId';

import { useInvalidateObjectQueries } from './useInvalidateObjectQueries';

/**
 * File size threshold (in bytes) above which presigned upload is used.
 * Files larger than this are uploaded directly to storage via a presigned URL
 * to avoid loading them through the API server.
 * Matches the backend MaxInMemorySizeMB default (20 MB).
 */
const PRESIGNED_UPLOAD_THRESHOLD =
  clientEnv.NEXT_PUBLIC_PRESIGNED_UPLOAD_THRESHOLD_MB * 1024 * 1024;

/**
 * Maximum file size (in bytes) for which a client-side SHA-256 checksum is computed.
 * Files larger than this skip the checksum to avoid loading the entire file into
 * memory via arrayBuffer(). The storage backend verifies integrity independently.
 * 100 MB.
 */
const CHECKSUM_SIZE_LIMIT = 100 * 1024 * 1024;

/** Status of a file in the upload queue */
export type QueuedFileStatus =
  | 'pending'
  | 'checking'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'conflict';

/** Represents a file in the upload queue */
export interface QueuedFile {
  /** Unique identifier for this queued file */
  id: string;
  /** The actual File object */
  file: File;
  /** Full target path in the repository (directory + filename) */
  targetPath: string;
  /** Current status of the file */
  status: QueuedFileStatus;
  /** Error message if upload failed */
  error?: string;
}

/** Conflict resolution action */
export type ConflictAction = 'replace' | 'skip' | 'replaceAll' | 'skipAll';

/** Return type for the useFileUpload hook */
interface UseFileUploadReturn {
  /** List of files in the queue */
  queuedFiles: QueuedFile[];
  /** Whether uploads are currently being processed */
  isProcessing: boolean;
  /** The file currently waiting for conflict resolution */
  currentConflict: QueuedFile | null;
  /** Add files to the upload queue */
  addFiles: (files: File[], basePath: string) => void;
  /** Remove a file from the queue (only pending files) */
  removeFile: (id: string) => void;
  /** Clear all files from the queue */
  clearQueue: () => void;
  /** Start processing the upload queue */
  startUpload: (ref: string) => Promise<void>;
  /** Resolve a conflict with the specified action */
  resolveConflict: (action: ConflictAction) => void;
  /** Number of completed uploads */
  completedCount: number;
  /** Number of failed uploads */
  failedCount: number;
  /** Number of skipped files */
  skippedCount: number;
  /** Total number of files in queue */
  totalCount: number;
  /** Whether all files have been processed */
  isComplete: boolean;
}

/**
 * Build the full path for a file in the repository
 */
function buildTargetPath(basePath: string, fileName: string): string {
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${cleanBase}${fileName}`;
}

/**
 * Hook for managing file uploads with queue and conflict detection
 *
 * @param workspaceSlug - The workspace slug
 * @param repositorySlug - The repository to upload files to
 * @returns Upload state and control functions
 */
export const useFileUpload = (
  workspaceSlug: string,
  repositorySlug: string
): UseFileUploadReturn => {
  const { getCore } = useIrminCore();
  const { invalidateObjectQueries } = useInvalidateObjectQueries(
    workspaceSlug,
    repositorySlug
  );

  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<QueuedFile | null>(
    null
  );

  // Use refs to track conflict resolution state across async operations
  const conflictResolutionRef = useRef<'ask' | 'replaceAll' | 'skipAll'>('ask');
  const conflictResolverRef = useRef<((action: ConflictAction) => void) | null>(
    null
  );
  // Track if upload was cancelled to prevent memory leaks
  const isCancelledRef = useRef(false);
  // Track removed file IDs to skip them during upload
  const removedFileIdsRef = useRef<Set<string>>(new Set());

  /**
   * Update the status of a specific file in the queue
   */
  const updateFileStatus = useCallback(
    (id: string, status: QueuedFileStatus, error?: string) => {
      setQueuedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status, error } : f))
      );
    },
    []
  );

  /**
   * Check if a file exists at the target path
   */
  const checkFileExists = useCallback(
    async (ref: string, path: string): Promise<boolean> => {
      try {
        const core = await getCore();
        const response = await core.objectService.getObjectAtPath({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path,
          ref,
        });
        // File exists if we get a response with data and it's not a directory
        return !!response.data && response.data.type !== 'group';
      } catch {
        // 404 or error means file doesn't exist
        return false;
      }
    },
    [getCore, workspaceSlug, repositorySlug]
  );

  /**
   * Upload a single file using presigned URL (for large files).
   * Generates a presigned upload URL, uploads directly to storage, then associates.
   */
  const uploadFilePresigned = useCallback(
    async (file: File, ref: string, path: string): Promise<void> => {
      const core = await getCore();

      // Step 1: Generate presigned upload URL
      const presignedResult =
        await core.objectService.generatePresignedUploadURL({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref,
          path,
        });

      if (!presignedResult.data) {
        throw new Error('Failed to generate presigned upload URL');
      }

      const { upload_url, physical_address } = presignedResult.data;

      // Step 2: Compute SHA-256 checksum for integrity verification.
      // Only for files that fit reasonably in memory; larger files rely on
      // storage-backend integrity checks (ETag). The checksum field is optional.
      let checksum: string | undefined;
      if (file.size <= CHECKSUM_SIZE_LIMIT) {
        checksum = await (async () => {
          const buffer = await file.arrayBuffer();
          const hash = await crypto.subtle.digest('SHA-256', buffer);
          return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        })();
      }

      // Step 3: Upload directly to storage via presigned URL.
      // Uses the File object which streams from disk, not from the ArrayBuffer.
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Direct upload failed with status ${uploadResponse.status}`
        );
      }

      // Step 4: Associate the upload with the repository path
      await core.objectService.associatePresignedUpload({
        workspace: workspaceSlug,
        repository: repositorySlug,
        ref,
        path,
        physicalAddress: physical_address,
        checksum: checksum ?? '',
        sizeBytes: file.size,
        contentType: file.type || 'application/octet-stream',
      });

      // Invalidate queries for the uploaded path
      invalidateObjectQueries(path, ref);
    },
    [getCore, workspaceSlug, repositorySlug, invalidateObjectQueries]
  );

  /**
   * Upload a single file. Uses presigned upload for files larger than 20MB
   * to avoid loading large files through the API server.
   */
  const uploadFile = useCallback(
    async (file: File, ref: string, path: string): Promise<void> => {
      if (file.size > PRESIGNED_UPLOAD_THRESHOLD) {
        return uploadFilePresigned(file, ref, path);
      }

      const core = await getCore();

      // Create a FileList-like object from the single file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      await core.objectService.uploadObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
        files: dataTransfer.files,
      });

      // Invalidate queries for the uploaded path
      invalidateObjectQueries(path, ref);
    },
    [
      getCore,
      workspaceSlug,
      repositorySlug,
      invalidateObjectQueries,
      uploadFilePresigned,
    ]
  );

  /**
   * Wait for user to resolve a conflict
   */
  const waitForConflictResolution = useCallback(
    (file: QueuedFile): Promise<ConflictAction> => {
      return new Promise((resolve) => {
        setCurrentConflict(file);
        conflictResolverRef.current = resolve;
      });
    },
    []
  );

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback((files: File[], basePath: string) => {
    const newFiles: QueuedFile[] = files.map((file) => ({
      id: generateTempId('upload'),
      file,
      targetPath: buildTargetPath(basePath, file.name),
      status: 'pending',
    }));
    setQueuedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  /**
   * Remove a file from the queue (only pending files)
   */
  const removeFile = useCallback((id: string) => {
    // Track removed IDs so upload loop skips them even if already in snapshot
    removedFileIdsRef.current.add(id);
    setQueuedFiles((prev) =>
      prev.filter((f) => f.id !== id || f.status !== 'pending')
    );
  }, []);

  /**
   * Clear all files from the queue and cancel any pending operations
   */
  const clearQueue = useCallback(() => {
    // Mark as cancelled to stop ongoing upload loop
    isCancelledRef.current = true;

    // Resolve any pending conflict promise to prevent memory leak
    if (conflictResolverRef.current) {
      conflictResolverRef.current('skip');
      conflictResolverRef.current = null;
    }

    setQueuedFiles([]);
    setCurrentConflict(null);
    setIsProcessing(false);
    conflictResolutionRef.current = 'ask';
    removedFileIdsRef.current.clear();
  }, []);

  /**
   * Resolve a conflict with the specified action
   */
  const resolveConflict = useCallback((action: ConflictAction) => {
    // Update the resolution mode for future conflicts
    if (action === 'replaceAll') {
      conflictResolutionRef.current = 'replaceAll';
    } else if (action === 'skipAll') {
      conflictResolutionRef.current = 'skipAll';
    }

    // Clear the current conflict
    setCurrentConflict(null);

    // Resolve the promise
    if (conflictResolverRef.current) {
      conflictResolverRef.current(action);
      conflictResolverRef.current = null;
    }
  }, []);

  /**
   * Start processing the upload queue
   */
  const startUpload = useCallback(
    async (ref: string): Promise<void> => {
      setIsProcessing(true);
      conflictResolutionRef.current = 'ask';
      isCancelledRef.current = false;
      removedFileIdsRef.current.clear();

      // Get the current queue snapshot
      const filesToProcess = queuedFiles.filter((f) => f.status === 'pending');

      for (const queuedFile of filesToProcess) {
        // Check if cancelled before processing each file
        if (isCancelledRef.current) {
          break;
        }

        // Skip files that were removed from queue during upload
        if (removedFileIdsRef.current.has(queuedFile.id)) {
          continue;
        }

        // Update to checking status
        updateFileStatus(queuedFile.id, 'checking');

        try {
          // Check if file exists
          const exists = await checkFileExists(ref, queuedFile.targetPath);

          // Check if cancelled after async operation
          if (isCancelledRef.current) {
            break;
          }

          if (exists) {
            // Read current resolution - use getter to avoid TypeScript flow narrowing
            const getResolution = () => conflictResolutionRef.current;

            if (getResolution() === 'skipAll') {
              updateFileStatus(queuedFile.id, 'skipped');
              continue;
            }

            if (getResolution() === 'ask') {
              // Update status to conflict and wait for user decision
              updateFileStatus(queuedFile.id, 'conflict');
              const action = await waitForConflictResolution(queuedFile);

              // Check if cancelled after conflict resolution
              if (isCancelledRef.current) {
                break;
              }

              if (action === 'skip' || action === 'skipAll') {
                updateFileStatus(queuedFile.id, 'skipped');
                continue;
              }
              // action is 'replace' or 'replaceAll' - continue to upload
            }
            // resolution is 'replaceAll' - continue to upload
          }

          // Upload the file
          updateFileStatus(queuedFile.id, 'uploading');
          await uploadFile(queuedFile.file, ref, queuedFile.targetPath);

          // Check if cancelled after upload
          if (isCancelledRef.current) {
            break;
          }

          updateFileStatus(queuedFile.id, 'completed');
        } catch (error) {
          // Don't update status if cancelled
          if (!isCancelledRef.current) {
            updateFileStatus(
              queuedFile.id,
              'failed',
              error instanceof Error ? error.message : 'Upload failed'
            );
          }
        }
      }

      setIsProcessing(false);
    },
    [
      queuedFiles,
      updateFileStatus,
      checkFileExists,
      uploadFile,
      waitForConflictResolution,
    ]
  );

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Mark as cancelled to stop any ongoing operations
      isCancelledRef.current = true;

      // Resolve any pending conflict promise
      if (conflictResolverRef.current) {
        conflictResolverRef.current('skip');
        conflictResolverRef.current = null;
      }
    };
  }, []);

  // Compute counts
  const completedCount = queuedFiles.filter(
    (f) => f.status === 'completed'
  ).length;
  const failedCount = queuedFiles.filter((f) => f.status === 'failed').length;
  const skippedCount = queuedFiles.filter((f) => f.status === 'skipped').length;
  const totalCount = queuedFiles.length;
  const isComplete =
    totalCount > 0 &&
    queuedFiles.every(
      (f) =>
        f.status === 'completed' ||
        f.status === 'failed' ||
        f.status === 'skipped'
    );

  return {
    queuedFiles,
    isProcessing,
    currentConflict,
    addFiles,
    removeFile,
    clearQueue,
    startUpload,
    resolveConflict,
    completedCount,
    failedCount,
    skippedCount,
    totalCount,
    isComplete,
  };
};
