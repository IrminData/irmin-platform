'use client';

import { memo, useCallback, useRef, useState } from 'react';

import { TbUpload } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

interface DropZoneProps {
  /** Callback when files are added */
  onFilesAdded: (files: File[]) => void;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
}

/**
 * Drag and drop zone for file uploads with file picker fallback
 *
 * @param props - Component properties
 * @returns The DropZone component
 */
const DropZone = ({ onFilesAdded, disabled = false }: DropZoneProps) => {
  const { dict } = useLocale();
  const [isDragOver, setIsDragOver] = useState(false);

  const dropZoneText = dict.repository.objects.uploadFiles.dropZone;
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle drag enter and drag over events (identical behavior)
   */
  const handleDragActive = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    },
    [disabled, onFilesAdded]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        onFilesAdded(Array.from(selectedFiles));
      }
      // Reset the input so the same file can be selected again
      e.target.value = '';
    },
    [onFilesAdded]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`
        flex min-h-[160px] w-full cursor-pointer flex-col items-center
        justify-center rounded-lg border-2 border-dashed p-6 transition-colors
        ${
          isDragOver
            ? 'border-irmin-blue-500 bg-irmin-blue-500/10'
            : `
              border-gray-300
              hover:border-gray-400
              dark:border-gray-600 dark:hover:border-gray-500
            `
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
      onDragEnter={handleDragActive}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragActive}
      onDrop={handleDrop}
      onClick={disabled ? undefined : handleBrowseClick}
      role='button'
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          handleBrowseClick();
        }
      }}
      aria-label={dropZoneText}
    >
      <TbUpload className='mb-3 size-10 text-gray-400' />
      <p
        className={`
          mb-2 text-sm text-gray-600
          dark:text-gray-400
        `}
      >
        {dropZoneText}
      </p>
      <Button
        type='button'
        variant='secondary'
        size='sm'
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          handleBrowseClick();
        }}
      >
        {dict.repository.objects.uploadFiles.browseFiles}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={handleFileInputChange}
        disabled={disabled}
        aria-hidden='true'
      />
    </div>
  );
};

export default memo(DropZone);
