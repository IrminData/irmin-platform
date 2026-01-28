'use client';

import { memo } from 'react';

import { TbPlus } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { QueuedFile } from '@/hooks/api/useFileUpload';

import UploadQueueItem from './UploadQueueItem';

interface UploadQueueProps {
  /** List of files in the queue */
  files: QueuedFile[];
  /** Whether uploads are currently being processed */
  isProcessing: boolean;
  /** Callback to remove a file from the queue */
  onRemoveFile: (id: string) => void;
  /** Callback to add more files */
  onAddMore: () => void;
  /** Callback to start uploading */
  onStartUpload: () => void;
  /** Number of completed uploads */
  completedCount: number;
  /** Number of skipped files */
  skippedCount: number;
  /** Number of failed uploads */
  failedCount: number;
  /** Whether all files have been processed */
  isComplete: boolean;
}

/**
 * Queue display component showing all files and their status
 *
 * @param props - Component properties
 * @returns The UploadQueue component
 */
const UploadQueue = ({
  files,
  isProcessing,
  onRemoveFile,
  onAddMore,
  onStartUpload,
  completedCount,
  skippedCount,
  failedCount,
  isComplete,
}: UploadQueueProps) => {
  const { dict } = useLocale();

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadDict = dict.repository.objects.uploadFiles;

  // Build summary text using localized strings
  const summaryParts: string[] = [];
  if (completedCount > 0) {
    summaryParts.push(
      uploadDict.summary.uploaded.replace('{count}', String(completedCount))
    );
  }
  if (skippedCount > 0) {
    summaryParts.push(
      uploadDict.summary.skipped.replace('{count}', String(skippedCount))
    );
  }
  if (failedCount > 0) {
    summaryParts.push(
      uploadDict.summary.failed.replace('{count}', String(failedCount))
    );
  }
  const summaryText = summaryParts.join(', ');

  return (
    <div className='flex flex-col gap-3'>
      {/* File list */}
      <div className='flex max-h-[300px] flex-col gap-2 overflow-y-auto'>
        {files.map((file) => (
          <UploadQueueItem key={file.id} file={file} onRemove={onRemoveFile} />
        ))}
      </div>

      {/* Add more button (only when not processing and not complete) */}
      {!isProcessing && !isComplete && (
        <Button variant='ghost' size='sm' onClick={onAddMore} className='w-fit'>
          <TbPlus className='mr-1 size-4' />
          {uploadDict.addMore}
        </Button>
      )}

      {/* Summary (only shown after processing starts) */}
      {(isProcessing || isComplete) && summaryText && (
        <p
          className={`
            text-sm text-gray-600
            dark:text-gray-400
          `}
        >
          {summaryText}
        </p>
      )}

      {/* Upload button (only when not processing and has pending files) */}
      {!isProcessing && !isComplete && pendingCount > 0 && (
        <Button variant='default' onClick={onStartUpload} className='w-full'>
          {uploadDict.startUpload.replace('{count}', String(pendingCount))}
        </Button>
      )}
    </div>
  );
};

export default memo(UploadQueue);
