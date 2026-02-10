'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbFile,
  TbLoader2,
  TbSettings,
  TbTag,
  TbVectorTriangle,
} from 'react-icons/tb';

import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MetadataEditor } from '@/components/ui/MetadataEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import MultiplePathsSelector from '@/components/workflow/MultiplePathsSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useEmbeddings } from '@/hooks/api';

import type { EmbeddingConfig } from '@/types/core/Embedding';

interface EmbeddingWizardProps {
  repositorySlug: string;
  currentRef: string;
  initialSourcePath?: string;
}

type WizardStep = 'source' | 'chunking' | 'metadata' | 'generate';

const STEPS: WizardStep[] = ['source', 'chunking', 'metadata', 'generate'];

/**
 * Multi-step wizard for creating embeddings with metadata and priority support.
 * Uses upsert for deduplication of already-indexed content.
 */
export default function EmbeddingWizard({
  repositorySlug,
  currentRef,
  initialSourcePath,
}: EmbeddingWizardProps) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');

  // Step 1: Source selection
  const [sourcePaths, setSourcePaths] = useState<string[]>(
    initialSourcePath ? [initialSourcePath] : []
  );
  const [outputPath, setOutputPath] = useState('');

  // Step 2: Chunking config
  const [config, setConfig] = useState<EmbeddingConfig>({
    model: 'text-embedding-3-small',
    dimensions: undefined,
    chunk_size: 1000,
    overlap: 200,
  });

  // Step 3: Metadata
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState(1.0);

  // Step 4: Results and submitted values snapshot
  const [results, setResults] = useState<{
    inserted: number;
    skipped: number;
    updated: number;
  } | null>(null);

  // Snapshot of values at submission time to prevent summary mismatch
  const [submittedValues, setSubmittedValues] = useState<{
    sourcePaths: string[];
    outputPath: string;
    config: EmbeddingConfig;
    metadata: Record<string, string>;
    priority: number;
  } | null>(null);

  // Resolve embedding path for the info query (only valid .parquet paths)
  const trimmedOutputPath = outputPath.trim();
  const embeddingPathForQuery =
    trimmedOutputPath.endsWith('.parquet') && trimmedOutputPath.length > 8
      ? trimmedOutputPath
      : undefined;

  const { upsertEmbeddingsMutation, embeddingInfoQuery } = useEmbeddings(
    repositorySlug,
    currentRef,
    embeddingPathForQuery
  );

  // Derive locked config from existing embedding file (no useEffect needed)
  const existingEmbeddingInfo = embeddingInfoQuery.data?.data ?? null;
  const configLocked = existingEmbeddingInfo != null;

  const effectiveConfig = useMemo<EmbeddingConfig>(() => {
    if (existingEmbeddingInfo) {
      return {
        model: existingEmbeddingInfo.model ?? 'text-embedding-3-small',
        dimensions: existingEmbeddingInfo.dimensions ?? undefined,
        chunk_size: existingEmbeddingInfo.chunk_size ?? 1000,
        overlap: existingEmbeddingInfo.overlap ?? 200,
      };
    }
    return config;
  }, [existingEmbeddingInfo, config]);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'source':
        return (
          sourcePaths.some((p) => p.trim()) &&
          outputPath.trim().endsWith('.parquet')
        );
      case 'chunking':
        return true; // All fields have defaults
      case 'metadata':
        return true; // Metadata is optional
      case 'generate':
        return false; // Final step
      default:
        return false;
    }
  }, [currentStep, sourcePaths, outputPath]);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const handlePrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleGenerate = useCallback(async () => {
    const validSourcePaths = sourcePaths.filter((p) => p.trim());
    if (validSourcePaths.length === 0 || !outputPath.trim()) return;

    // Build config from effective config (which uses existing file config when locked)
    const embeddingConfig: EmbeddingConfig = {};
    if (effectiveConfig.model?.trim())
      embeddingConfig.model = effectiveConfig.model.trim();
    if (effectiveConfig.dimensions && effectiveConfig.dimensions > 0)
      embeddingConfig.dimensions = effectiveConfig.dimensions;
    if (effectiveConfig.chunk_size && effectiveConfig.chunk_size > 0)
      embeddingConfig.chunk_size = effectiveConfig.chunk_size;
    if (effectiveConfig.overlap !== undefined && effectiveConfig.overlap >= 0)
      embeddingConfig.overlap = effectiveConfig.overlap;

    // Capture submitted values before mutation to ensure summary accuracy
    setSubmittedValues({
      sourcePaths: validSourcePaths,
      outputPath: outputPath.trim(),
      config: { ...effectiveConfig },
      metadata: { ...metadata },
      priority,
    });

    try {
      const result = await upsertEmbeddingsMutation.mutateAsync({
        sourcePaths: validSourcePaths,
        outputPath: outputPath.trim(),
        ref: currentRef,
        config:
          Object.keys(embeddingConfig).length > 0 ? embeddingConfig : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        priority: priority !== 1.0 ? priority : undefined,
      });

      // Always transition to completion state after successful mutation.
      // Use response data if available, otherwise default to zeros.
      setResults({
        inserted: result.data?.inserted ?? 0,
        skipped: result.data?.skipped ?? 0,
        updated: result.data?.updated ?? 0,
      });
    } catch {
      // Reset submitted values on failure so the summary reflects
      // the current form state if the user goes back and modifies values.
      setSubmittedValues(null);
    }
  }, [
    sourcePaths,
    outputPath,
    currentRef,
    effectiveConfig,
    metadata,
    priority,
    upsertEmbeddingsMutation,
  ]);

  const renderStepIndicator = () => (
    <div className='flex items-center justify-center gap-2 pb-4'>
      {STEPS.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = index < currentStepIndex;
        return (
          <div key={step} className='flex items-center gap-2'>
            <div
              className={`
                flex size-8 items-center justify-center rounded-full text-xs
                font-medium transition-colors
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {isCompleted ? <TbCheck className='size-4' /> : index + 1}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`
                  h-0.5 w-8 transition-colors
                  ${isCompleted ? 'bg-primary/50' : 'bg-muted'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSourceStep = () => (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TbFile className='size-5 text-primary' />
        <h3 className='font-medium'>
          {dict.repository.objects.embeddingsWizardSelectSource}
        </h3>
      </div>

      {/* Model Selection */}
      <div className='flex flex-col gap-2'>
        <Label htmlFor='model'>{dict.repository.objects.embeddingsModel}</Label>
        <Select
          value={effectiveConfig.model || 'text-embedding-3-small'}
          onValueChange={(value) =>
            setConfig((prev) => ({ ...prev, model: value }))
          }
          disabled={configLocked}
        >
          <SelectTrigger id='model'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text-embedding-3-small'>
              text-embedding-3-small (1536 dims)
            </SelectItem>
            <SelectItem value='text-embedding-3-large'>
              text-embedding-3-large (3072 dims)
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
        <p className='text-xs text-muted-foreground'>
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
    </div>
  );

  const renderChunkingStep = () => (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TbSettings className='size-5 text-primary' />
        <h3 className='font-medium'>
          {dict.repository.objects.embeddingsWizardConfigureChunking}
        </h3>
      </div>

      {configLocked && (
        <div
          className={`
            rounded-lg border border-blue-200 bg-blue-50 p-3
            dark:border-blue-900 dark:bg-blue-950/30
          `}
        >
          <p
            className={`
              text-sm font-medium text-blue-700
              dark:text-blue-400
            `}
          >
            {dict.repository.objects.embeddingsConfigLoaded}
          </p>
          <p
            className={`
              text-xs text-blue-600
              dark:text-blue-500
            `}
          >
            {dict.repository.objects.embeddingsConfigLoadedDescription}
          </p>
        </div>
      )}

      <div
        className={`
          grid gap-4
          md:grid-cols-2
        `}
      >
        <div className='flex flex-col gap-2'>
          <Label htmlFor='chunk-size'>
            {dict.repository.objects.embeddingsChunkSize}
          </Label>
          <Input
            id='chunk-size'
            type='number'
            min={100}
            max={4000}
            value={effectiveConfig.chunk_size ?? 1000}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                chunk_size: e.target.value ? parseInt(e.target.value) : 1000,
              }))
            }
            disabled={configLocked}
          />
          <p className='text-xs text-muted-foreground'>
            Characters per chunk (100-4000)
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='overlap'>
            {dict.repository.objects.embeddingsOverlap}
          </Label>
          <Input
            id='overlap'
            type='number'
            min={0}
            max={500}
            value={effectiveConfig.overlap ?? 200}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                overlap: e.target.value ? parseInt(e.target.value) : 200,
              }))
            }
            disabled={configLocked}
          />
          <p className='text-xs text-muted-foreground'>
            Overlap between chunks (0-500)
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='dimensions'>
            {dict.repository.objects.embeddingsDimensions}
          </Label>
          <Input
            id='dimensions'
            type='number'
            min={0}
            value={effectiveConfig.dimensions ?? ''}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                dimensions: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              }))
            }
            placeholder='Auto (model default)'
            disabled={configLocked}
          />
          <p className='text-xs text-muted-foreground'>
            Leave empty for model default
          </p>
        </div>
      </div>
    </div>
  );

  const renderMetadataStep = () => (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TbTag className='size-5 text-primary' />
        <h3 className='font-medium'>
          {dict.repository.objects.embeddingsWizardAddMetadata}
        </h3>
      </div>

      {/* Priority Slider */}
      <div className='flex flex-col gap-2'>
        <Label htmlFor='priority'>
          {dict.repository.objects.embeddingsPriority}: {priority.toFixed(2)}
        </Label>
        <input
          id='priority'
          type='range'
          min={0}
          max={1}
          step={0.1}
          value={priority}
          onChange={(e) => setPriority(parseFloat(e.target.value))}
          className='w-full'
        />
        <p className='text-xs text-muted-foreground'>
          {dict.repository.objects.embeddingsPriorityDescription}
        </p>
      </div>

      <Separator />

      {/* Metadata Editor */}
      <MetadataEditor value={metadata} onChange={setMetadata} />
    </div>
  );

  const renderGenerateStep = () => (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TbVectorTriangle className='size-5 text-primary' />
        <h3 className='font-medium'>
          {dict.repository.objects.embeddingsWizardGenerate}
        </h3>
      </div>

      {/* Summary - use submitted values when available to prevent mismatch */}
      {(() => {
        // Use submitted values during/after generation, otherwise use current state
        const displaySourcePaths =
          submittedValues?.sourcePaths ?? sourcePaths.filter((p) => p.trim());
        const displayOutputPath = submittedValues?.outputPath ?? outputPath;
        const displayConfig = submittedValues?.config ?? effectiveConfig;
        const displayMetadata = submittedValues?.metadata ?? metadata;
        const displayPriority = submittedValues?.priority ?? priority;

        return (
          <div className='rounded-lg border bg-muted/30 p-4'>
            <h4 className='mb-2 font-medium'>Summary</h4>
            <div className='flex flex-col gap-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Source Files:</span>
                <span>{displaySourcePaths.length}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Output Path:</span>
                <span className='max-w-48 truncate'>{displayOutputPath}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Model:</span>
                <span>{displayConfig.model ?? 'text-embedding-3-small'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Chunk Size:</span>
                <span>{displayConfig.chunk_size ?? 1000}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Priority:</span>
                <span>{displayPriority.toFixed(2)}</span>
              </div>
              {Object.keys(displayMetadata).length > 0 && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Metadata Fields:
                  </span>
                  <span>{Object.keys(displayMetadata).length}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Results */}
      {results && (
        <div
          className={`
            rounded-lg border border-green-200 bg-green-50 p-4
            dark:border-green-900 dark:bg-green-950/30
          `}
        >
          <h4
            className={`
              mb-2 font-medium text-green-700
              dark:text-green-400
            `}
          >
            Completed
          </h4>
          <div className='flex gap-4'>
            <Badge variant='secondary'>
              {dict.repository.objects.embeddingsUpsertInserted}:{' '}
              {results.inserted}
            </Badge>
            <Badge variant='secondary'>
              {dict.repository.objects.embeddingsUpsertSkipped}:{' '}
              {results.skipped}
            </Badge>
            <Badge variant='secondary'>
              {dict.repository.objects.embeddingsUpsertUpdated}:{' '}
              {results.updated}
            </Badge>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!results && (
        <Button
          variant='accent'
          onClick={handleGenerate}
          disabled={upsertEmbeddingsMutation.isPending}
          icon={
            upsertEmbeddingsMutation.isPending ? (
              <TbLoader2 className='animate-spin' />
            ) : (
              <TbVectorTriangle />
            )
          }
          className='w-full'
        >
          {upsertEmbeddingsMutation.isPending
            ? dict.repository.objects.embeddingsWizardGenerating
            : dict.repository.objects.embeddingsWizardGenerate}
        </Button>
      )}

      {/* Close Button */}
      {results && (
        <Button
          variant='outline'
          onClick={() => irminModal.close()}
          className='w-full'
        >
          {dict.common.close}
        </Button>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'source':
        return renderSourceStep();
      case 'chunking':
        return renderChunkingStep();
      case 'metadata':
        return renderMetadataStep();
      case 'generate':
        return renderGenerateStep();
      default:
        return null;
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      {renderStepIndicator()}
      <Separator />
      {renderCurrentStep()}
      <Separator />

      {/* Navigation */}
      <div className='flex justify-between'>
        <Button
          variant='ghost'
          onClick={handlePrev}
          disabled={
            currentStepIndex === 0 ||
            results !== null ||
            upsertEmbeddingsMutation.isPending
          }
          icon={<TbChevronLeft />}
        >
          {dict.common.back}
        </Button>
        {currentStep !== 'generate' && (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            icon={<TbChevronRight />}
            iconFirst={false}
          >
            {dict.common.next}
          </Button>
        )}
      </div>
    </div>
  );
}
