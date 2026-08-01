'use client';

import { useCallback, useMemo, useState } from 'react';

import { Controller, useForm, useWatch } from 'react-hook-form';

import { TbLink } from 'react-icons/tb';

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

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

import type { Repository } from '@/types/core/Repository';

interface CreatePointerFormValues {
  pointerName: string;
  targetRepository: string;
  targetPath: string;
  targetRef: string;
}

interface CreatePointerModalProps {
  createPointer: (
    pointerPath: string,
    targetRepository: string,
    targetPath: string,
    targetRef: string
  ) => Promise<void>;
  currentRepository: string;
  currentPath?: string;
  repositories: Repository[];
  workspaceSlug: string;
}

/**
 * Modal for creating a pointer to an object in another repository.
 */
export default function CreatePointerModal({
  createPointer,
  currentRepository,
  currentPath,
  repositories,
  workspaceSlug,
}: CreatePointerModalProps) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter out the current repository
  const availableRepositories = repositories.filter(
    (r) => r.slug !== currentRepository
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePointerFormValues>({
    defaultValues: {
      pointerName: '',
      targetRepository: '',
      targetPath: '',
      targetRef: 'main',
    },
  });

  const targetRepository = useWatch({ control, name: 'targetRepository' });
  const targetPath = useWatch({ control, name: 'targetPath' });
  const targetRef = useWatch({ control, name: 'targetRef' });
  const pointerName = useWatch({ control, name: 'pointerName' });

  const selectedRepo = useMemo(
    () =>
      targetRepository
        ? (repositories.find((r) => r.slug === targetRepository) ?? null)
        : null,
    [targetRepository, repositories]
  );

  const clearPathAndName = useCallback(() => {
    setValue('targetPath', '');
    setValue('pointerName', '');
  }, [setValue]);

  const handleTargetPathChange = useCallback(
    (path: string) => {
      setValue('targetPath', path);
      // Auto-generate pointer name from target path
      if (path) {
        const filename = path.split('/').pop() ?? '';
        setValue('pointerName', filename);
      }
    },
    [setValue]
  );

  const handleCreatePointer = useCallback(
    async (data: CreatePointerFormValues) => {
      try {
        setLoading(true);
        setError('');

        if (!data.targetRepository) {
          setError(dict.repository.objects.pleaseSelectTargetRepository);
          return;
        }

        if (!data.targetPath) {
          setError(dict.repository.objects.pleaseSelectTargetObject);
          return;
        }

        if (!data.pointerName) {
          setError(dict.repository.objects.pleaseEnterPointerName);
          return;
        }

        // Build the pointer path with _ptr. prefix
        const pointerFileName = `_ptr.${data.pointerName}`;
        let pointerPath = pointerFileName;
        if (currentPath && currentPath !== '/') {
          // Strip trailing slash from currentPath
          const basePath = currentPath.replace(/\/$/, '');
          pointerPath = `${basePath}/${pointerFileName}`;
        }

        // Create the pointer
        await createPointer(
          pointerPath,
          data.targetRepository,
          data.targetPath,
          data.targetRef
        );

        // Close the modal
        irminModal.close();
      } catch (err) {
        console.error('Failed to create pointer:', err);
        setError(
          (err as Error)?.message ??
            dict.repository.objects.couldNotCreatePointer
        );
      } finally {
        setLoading(false);
      }
    },
    [
      createPointer,
      irminModal,
      currentPath,
      dict.repository.objects.couldNotCreatePointer,
      dict.repository.objects.pleaseEnterPointerName,
      dict.repository.objects.pleaseSelectTargetObject,
      dict.repository.objects.pleaseSelectTargetRepository,
    ]
  );

  return (
    <WorkspaceProvider workspaceSlug={workspaceSlug}>
      <form
        onSubmit={handleSubmit(handleCreatePointer)}
        className='flex flex-col gap-4'
      >
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <TbLink className='size-4' />
          <span>{dict.repository.objects.createPointerDescription}</span>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>{dict.repository.objects.targetRepository}</Label>
          <Controller
            name='targetRepository'
            control={control}
            rules={{
              required: dict.repository.objects.pleaseSelectTargetRepository,
            }}
            render={({ field }) => (
              <>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    clearPathAndName();
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue
                      placeholder={dict.repository.objects.selectRepository}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRepositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.slug}>
                        {repo.name} ({repo.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.targetRepository && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.targetRepository.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        {selectedRepo && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.repository.objects.targetBranchRef}</Label>
              <Controller
                name='targetRef'
                control={control}
                rules={{
                  required: dict.repository.objects.pleaseEnterTargetRef,
                }}
                render={({ field }) => (
                  <>
                    <Input
                      type='text'
                      placeholder={selectedRepo.default_branch ?? 'main'}
                      disabled={loading}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        clearPathAndName();
                      }}
                    />
                    {errors.targetRef && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.targetRef.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className='flex flex-col gap-2'>
              <Label>{dict.repository.objects.targetObject}</Label>
              <RepositoryPathSelector
                key={`${targetRepository}-${targetRef}`}
                repositorySlug={selectedRepo.slug}
                repositoryRef={
                  targetRef ?? selectedRepo.default_branch ?? 'main'
                }
                defaultPath=''
                onPathChange={handleTargetPathChange}
                defaultExpanded
                nonGroupOnly
                existingOnly
              />
              {errors.targetPath && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.targetPath.message}
                </p>
              )}
            </div>
          </>
        )}

        <div className='flex flex-col gap-2'>
          <Label>{dict.repository.objects.pointerName}</Label>
          <Controller
            name='pointerName'
            control={control}
            rules={{ required: dict.repository.objects.pleaseEnterPointerName }}
            render={({ field }) => (
              <>
                <Input
                  type='text'
                  placeholder='customers.json'
                  disabled={loading || !targetPath}
                  {...field}
                />
                <p className='text-xs text-muted-foreground'>
                  {dict.repository.objects.pointerWillBeSavedAs}: _ptr.
                  {field.value || '<name>'}
                </p>
                {errors.pointerName && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.pointerName.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        {error && <div className='py-2 text-destructive'>{error}</div>}

        <div className='pb-3'>
          <Button
            variant='default'
            className='w-full'
            loading={loading}
            type='submit'
            disabled={!targetRepository || !targetPath || !pointerName}
          >
            {dict.repository.objects.createPointer}
          </Button>
        </div>
      </form>
    </WorkspaceProvider>
  );
}
