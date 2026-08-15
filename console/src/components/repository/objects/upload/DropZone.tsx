'use client';

import { memo, useCallback, useRef, useState } from 'react';

import { TbUpload } from 'react-icons/tb';

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
        justify-center rounded-[2px] border-2 border-dashed p-6
        transition-colors
        ${
          isDragOver
            ? 'border-accent bg-accent/10'
            : `
              border-border
              hover:border-foreground/40
            `
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-accent
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
          e.preventDefault();
          handleBrowseClick();
        }
      }}
      aria-label={dropZoneText}
      aria-disabled={disabled || undefined}
    >
      <TbUpload
        className='mb-3 size-10 text-muted-foreground'
        aria-hidden='true'
      />
      <p className={`mb-2 text-sm text-muted-foreground`}>{dropZoneText}</p>
      <span
        aria-hidden='true'
        className={`
          pointer-events-none inline-flex h-11 items-center justify-center
          rounded-[2px] bg-secondary px-4 text-xs font-medium
          text-secondary-foreground
          md:h-9
        `}
      >
        {dict.repository.objects.uploadFiles.browseFiles}
      </span>

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
