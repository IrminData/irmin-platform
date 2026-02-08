'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbFile, TbLoader2, TbStar, TbVectorTriangle } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MetadataEditor } from '@/components/ui/MetadataEditor';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';

import type { EmbeddingSearchResult } from '@/types/core/Embedding';

interface EmbeddingEditSheetProps {
  /** The embedding result to edit */
  embedding: EmbeddingSearchResult;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback to save metadata changes */
  onSaveMetadata: (
    embeddingId: string,
    metadata: Record<string, string>
  ) => Promise<void>;
  /** Callback to save priority changes */
  onSavePriority: (embeddingId: string, priority: number) => Promise<void>;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
}

/**
 * Side sheet for editing embedding metadata and priority.
 * Displays read-only context and editable fields.
 */
export default function EmbeddingEditSheet({
  embedding,
  open,
  onOpenChange,
  onSaveMetadata,
  onSavePriority,
  isSaving = false,
}: EmbeddingEditSheetProps) {
  const { dict } = useLocale();

  // Editable state initialized from embedding
  const [priority, setPriority] = useState(embedding.priority ?? 1.0);
  const [metadata, setMetadata] = useState<Record<string, string>>(
    embedding.metadata ?? {}
  );

  // Track previous embedding id to reset state when embedding changes
  // This is the React-recommended pattern for adjusting state during render
  const [prevEmbeddingId, setPrevEmbeddingId] = useState(embedding.id);
  if (prevEmbeddingId !== embedding.id) {
    setPrevEmbeddingId(embedding.id);
    setPriority(embedding.priority ?? 1.0);
    setMetadata(embedding.metadata ?? {});
  }

  // Track original values to detect changes
  const originalPriority = useMemo(
    () => embedding.priority ?? 1.0,
    [embedding.priority]
  );
  const originalMetadata = useMemo(
    () => embedding.metadata ?? {},
    [embedding.metadata]
  );

  // Check if values have changed
  const hasPriorityChanged = priority !== originalPriority;
  const hasMetadataChanged = useMemo(() => {
    const origKeys = Object.keys(originalMetadata);
    const newKeys = Object.keys(metadata);
    if (origKeys.length !== newKeys.length) return true;
    return origKeys.some((key) => originalMetadata[key] !== metadata[key]);
  }, [originalMetadata, metadata]);

  const hasChanges = hasPriorityChanged || hasMetadataChanged;

  const handleSave = useCallback(async () => {
    // Save changes in parallel if both changed
    const promises: Promise<void>[] = [];

    if (hasPriorityChanged) {
      promises.push(onSavePriority(embedding.id, priority));
    }

    if (hasMetadataChanged) {
      promises.push(onSaveMetadata(embedding.id, metadata));
    }

    await Promise.all(promises);
    onOpenChange(false);
  }, [
    embedding.id,
    hasPriorityChanged,
    hasMetadataChanged,
    priority,
    metadata,
    onSavePriority,
    onSaveMetadata,
    onOpenChange,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className={`
          w-full overflow-y-auto
          sm:max-w-lg
        `}
      >
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <TbVectorTriangle className='size-5 text-purple-500' />
            {dict.repository.objects.embeddingsEditTitle}
          </SheetTitle>
          <SheetDescription>
            {dict.repository.objects.embeddingsEditDescription}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-6 py-6'>
          {/* Read-only Info Section */}
          <div className='flex flex-col gap-4'>
            {/* Content Preview */}
            <div className='flex flex-col gap-2'>
              <Label className='text-sm font-medium'>
                {dict.repository.objects.embeddingsContent}
              </Label>
              <div
                className={`
                  max-h-32 overflow-y-auto rounded-md border bg-muted/30 p-3
                  text-sm leading-relaxed text-muted-foreground
                `}
              >
                {embedding.content}
              </div>
            </div>

            {/* Source File & Chunk */}
            <div className='flex flex-wrap gap-4'>
              <div className='flex items-center gap-2'>
                <TbFile className='size-4 text-muted-foreground' />
                <span className='text-sm font-medium'>
                  {embedding.source_file}
                </span>
              </div>
              <Badge variant='secondary' className='font-mono text-xs'>
                {dict.repository.objects.embeddingsChunk} #
                {embedding.chunk_index}
              </Badge>
              <Badge
                variant={embedding.score >= 0.8 ? 'default' : 'secondary'}
                className='font-mono text-xs'
              >
                {dict.repository.objects.embeddingsScore}:{' '}
                {(embedding.score * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Editable Priority Section */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <TbStar
                className={`
                  size-4
                  ${
                    priority >= 0.8
                      ? 'text-yellow-500'
                      : `text-muted-foreground`
                  }
                `}
              />
              <Label htmlFor='edit-priority' className='text-sm font-medium'>
                {dict.repository.objects.embeddingsPriority}:{' '}
                {priority.toFixed(2)}
              </Label>
            </div>
            <input
              id='edit-priority'
              type='range'
              min={0}
              max={1}
              step={0.1}
              value={priority}
              onChange={(e) => setPriority(parseFloat(e.target.value))}
              className='w-full'
              disabled={isSaving}
            />
            <p className='text-xs text-muted-foreground'>
              {dict.repository.objects.embeddingsPriorityDescription}
            </p>
          </div>

          <Separator />

          {/* Editable Metadata Section */}
          <MetadataEditor
            value={metadata}
            onChange={setMetadata}
            disabled={isSaving}
          />
        </div>

        {/* Footer Actions */}
        <div className='flex justify-end gap-2 border-t pt-4'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant='accent'
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            icon={isSaving ? <TbLoader2 className='animate-spin' /> : undefined}
          >
            {isSaving
              ? dict.repository.objects.embeddingsEditSaving
              : dict.repository.objects.embeddingsEditSave}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
