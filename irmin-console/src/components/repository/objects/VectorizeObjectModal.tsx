'use client';

import { useCallback, useState } from 'react';

import { TbLoader2, TbVectorTriangle } from 'react-icons/tb';

import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultiplePathsSelector from '@/components/workflow/MultiplePathsSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useEmbeddings } from '@/hooks/api';

import type { EmbeddingConfig } from '@/types/core/Embedding';

interface VectorizeObjectModalProps {
  repositorySlug: string;
  currentRef: string;
  initialSourcePath?: string;
}

/**
 * Modal for vectorizing repository objects to create embeddings.
 */
export default function VectorizeObjectModal({
  repositorySlug,
  currentRef,
  initialSourcePath,
}: VectorizeObjectModalProps) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const { vectorizeObjectsMutation } = useEmbeddings(
    repositorySlug,
    currentRef
  );

  const [sourcePaths, setSourcePaths] = useState<string[]>(
    initialSourcePath ? [initialSourcePath] : []
  );
  const [outputPath, setOutputPath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<EmbeddingConfig>({
    model: 'text-embedding-3-small',
    dimensions: undefined,
    chunk_size: undefined,
    overlap: undefined,
  });

  const handleSubmit = useCallback(async () => {
    const validSourcePaths = sourcePaths.filter((p) => p.trim());
    if (validSourcePaths.length === 0 || !outputPath.trim()) return;

    // Build config, filtering out empty/undefined values
    const embeddingConfig: EmbeddingConfig = {};
    if (config.model?.trim()) embeddingConfig.model = config.model.trim();
    if (config.dimensions && config.dimensions > 0)
      embeddingConfig.dimensions = config.dimensions;
    if (config.chunk_size && config.chunk_size > 0)
      embeddingConfig.chunk_size = config.chunk_size;
    if (config.overlap !== undefined && config.overlap >= 0)
      embeddingConfig.overlap = config.overlap;

    await vectorizeObjectsMutation.mutateAsync({
      sourcePaths: validSourcePaths,
      outputPath: outputPath.trim(),
      ref: currentRef,
      config:
        Object.keys(embeddingConfig).length > 0 ? embeddingConfig : undefined,
    });

    irminModal.close();
  }, [
    sourcePaths,
    outputPath,
    currentRef,
    config,
    vectorizeObjectsMutation,
    irminModal,
  ]);

  const isValid =
    sourcePaths.some((p) => p.trim()) && outputPath.trim().endsWith('.parquet');

  return (
    <div className='flex flex-col gap-4'>
      {/* Model Selection */}
      <div className='flex flex-col gap-2'>
        <Label htmlFor='model'>{dict.repository.objects.embeddingsModel}</Label>
        <Select
          value={config.model || 'text-embedding-3-small'}
          onValueChange={(value) =>
            setConfig((prev) => ({ ...prev, model: value }))
          }
        >
          <SelectTrigger id='model'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text-embedding-3-small'>
              text-embedding-3-small
            </SelectItem>
            <SelectItem value='text-embedding-3-large'>
              text-embedding-3-large
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Source Paths */}
      <div className='flex flex-col gap-2'>
        <MultiplePathsSelector
          label={dict.repository.objects.vectorizeSourcePaths}
          paths={sourcePaths}
          onPathsChange={setSourcePaths}
          renderPathSelector={(path, onPathChange) => (
            <RepositoryPathSelector
              repositorySlug={repositorySlug}
              repositoryRef={currentRef}
              defaultPath={path}
              onPathChange={onPathChange}
            />
          )}
        />
        <p className='-mt-2 text-xs text-muted-foreground'>
          {dict.repository.objects.vectorizeSourcePathsDescription}
        </p>
      </div>

      {/* Output Path */}
      <div className='flex flex-col gap-2'>
        <Label htmlFor='output-path'>
          {dict.repository.objects.vectorizeOutputPath}
        </Label>
        <p className='text-xs text-muted-foreground'>
          {dict.repository.objects.vectorizeOutputPathDescription}
        </p>
        <RepositoryPathSelector
          repositorySlug={repositorySlug}
          repositoryRef={currentRef}
          defaultPath={outputPath}
          onPathChange={setOutputPath}
        />
      </div>

      {/* Advanced Options Toggle */}
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowAdvanced(!showAdvanced)}
        className='self-start'
      >
        {showAdvanced
          ? dict.common.hideAdvancedOption
          : dict.common.showAdvancedOptions}
      </Button>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <div
          className={`
            grid gap-4 rounded-lg border bg-muted/30 p-4
            md:grid-cols-2
          `}
        >
          <div className='flex flex-col gap-2'>
            <Label htmlFor='dimensions'>
              {dict.repository.objects.embeddingsDimensions}
            </Label>
            <Input
              id='dimensions'
              type='number'
              min={0}
              value={config.dimensions ?? ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  dimensions: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
              }
              placeholder='1536'
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='chunk-size'>
              {dict.repository.objects.embeddingsChunkSize}
            </Label>
            <Input
              id='chunk-size'
              type='number'
              min={0}
              value={config.chunk_size ?? ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  chunk_size: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
              }
              placeholder='1000'
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='overlap'>
              {dict.repository.objects.embeddingsOverlap}
            </Label>
            <Input
              id='overlap'
              type='number'
              min={0}
              value={config.overlap ?? ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  overlap: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
              }
              placeholder='200'
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        variant='accent'
        onClick={handleSubmit}
        disabled={!isValid || vectorizeObjectsMutation.isPending}
        icon={
          vectorizeObjectsMutation.isPending ? (
            <TbLoader2 className='animate-spin' />
          ) : (
            <TbVectorTriangle />
          )
        }
        className='w-full'
      >
        {dict.repository.objects.vectorize}
      </Button>
    </div>
  );
}
