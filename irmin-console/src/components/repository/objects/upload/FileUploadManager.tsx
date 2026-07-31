'use client';

import { memo, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { useFileUpload } from '@/hooks/api/useFileUpload';

import DropZone from './DropZone';
import FileConflictDialog from './FileConflictDialog';
import UploadQueue from './UploadQueue';

interface FileUploadManagerProps {
  /** Current directory path in the repository browser */
  currentPath: string;
  /** Current branch/ref */
  currentRef: string;
  /** Repository slug */
  repository: string;
  /** Workspace slug */
  workspaceSlug: string;
  /** Callback when the modal should close */
  onComplete: () => void;
}

/**
 * Main component for file upload orchestration
 *
 * Combines DropZone, UploadQueue, and FileConflictDialog to provide
 * a complete drag-and-drop file upload experience with conflict handling.
 *
 * @param props - Component properties
 * @returns The FileUploadManager component
 */
const FileUploadManager = ({
  currentPath,
  currentRef,
  repository,
  workspaceSlug,
  onComplete,
}: FileUploadManagerProps) => {
  const { dict } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useFileUpload(workspaceSlug, repository);

  const uploadDict = dict.repository.objects.uploadFiles;

  /**
   * Handle files being added from DropZone
   */
  const handleFilesAdded = useCallback(
    (files: File[]) => {
      addFiles(files, currentPath);
    },
    [addFiles, currentPath]
  );

  /**
   * Handle "Add More" button click
   */
  const handleAddMore = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle file input change for "Add More"
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFilesAdded(Array.from(selectedFiles));
      }
      e.target.value = '';
    },
    [handleFilesAdded]
  );

  /**
   * Handle start upload
   */
  const handleStartUpload = useCallback(() => {
    startUpload(currentRef);
  }, [startUpload, currentRef]);

  /**
   * Handle done button click
   */
  const handleDone = useCallback(() => {
    clearQueue();
    onComplete();
  }, [clearQueue, onComplete]);

  // Show the path where files will be uploaded
  // Handle both '/' and '' (empty string) as root path
  const displayPath =
    currentPath === '' || currentPath === '/' ? '/' : currentPath;

  return (
    <div className='flex flex-col gap-4'>
      {/* Upload destination */}
      <div
        className={`
          text-sm text-gray-600
          dark:text-gray-400
        `}
      >
        {uploadDict.uploadingTo}{' '}
        <span className='font-mono font-medium text-foreground'>
          {displayPath}
        </span>
      </div>

      {/* Drop zone (shown when no files are queued or when not processing) */}
      {totalCount === 0 && (
        <DropZone onFilesAdded={handleFilesAdded} disabled={isProcessing} />
      )}

      {/* Upload queue (shown when files are queued) */}
      {totalCount > 0 && (
        <UploadQueue
          files={queuedFiles}
          isProcessing={isProcessing}
          onRemoveFile={removeFile}
          onAddMore={handleAddMore}
          onStartUpload={handleStartUpload}
          completedCount={completedCount}
          skippedCount={skippedCount}
          failedCount={failedCount}
          isComplete={isComplete}
        />
      )}

      {/* Done button (shown when upload is complete) */}
      {isComplete && (
        <Button variant='default' onClick={handleDone} className='w-full'>
          {uploadDict.done}
        </Button>
      )}

      {/* Hidden file input for "Add More" */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={handleFileInputChange}
        aria-hidden='true'
      />

      {/* Conflict dialog (shown when there's a conflict) */}
      {currentConflict && (
        <FileConflictDialog file={currentConflict} onSelect={resolveConflict} />
      )}
    </div>
  );
};

export default memo(FileUploadManager);
