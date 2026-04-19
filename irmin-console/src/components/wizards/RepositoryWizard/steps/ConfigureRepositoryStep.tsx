'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRepositories } from '@/hooks/api';

import type { Repository } from '@/types/core/Repository';
import type { Tag } from '@/types/core/Tag';

import type { RepositoryWizardData } from '../types';

/**
 * Step component for configuring repository details
 */
export default function ConfigureRepositoryStep({
  wizardData,
  updateWizardData,
  goNext,
  embedded = false,
  onComplete,
  onCancel,
}: {
  wizardData: RepositoryWizardData;
  updateWizardData: (updates: Partial<RepositoryWizardData>) => void;
  goNext: () => void;
  embedded?: boolean;
  onComplete?: (repository: Repository) => void;
  onCancel?: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: wizardData.name,
      description: wizardData.description,
      default_branch: wizardData.default_branch,
    },
  });

  const { createRepositoryMutation } = useRepositories();

  const handleTagsChange = useCallback(
    async (tags: Tag[]) => {
      updateWizardData({ tags });
      return tags;
    },
    [updateWizardData]
  );

  const handleCreate = useCallback(
    async (data: RepositoryWizardData) => {
      try {
        const res = await createRepositoryMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: '',
          default_branch: data.default_branch,
          isImmutable: false,
          tags: wizardData.tags?.map((t) => t.id),
        });

        if (!res.data) {
          throw new Error(
            res.message ?? dict.common.errors.mutations.createRepositoryFailed
          );
        }

        updateWizardData(data);
        irminAlert('success', res.message ?? 'Repository created successfully');

        // Handle completion based on mode
        if (embedded && onComplete) {
          onComplete(res.data);
        } else {
          goNext();
        }
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.common.errors.mutations.createRepositoryFailed
        );
      }
    },
    [
      createRepositoryMutation,
      updateWizardData,
      goNext,
      embedded,
      onComplete,
      wizardData.tags,
      irminAlert,
      dict,
    ]
  );

  return (
    <div
      className={`
        flex flex-col gap-4
        ${!embedded ? 'px-4 py-8' : ''}
      `}
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.common.name}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} />
              {errors.name && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.name.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>
          {dict.common.description} ({dict.common.optional.toLowerCase()})
        </Label>
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <>
              <Input
                {...field}
                longtext={{
                  rows: 3,
                }}
              />
              {errors.description && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.description.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.branches.primaryBranch}</Label>
        <Controller
          name='default_branch'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} />
              {errors.default_branch && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.default_branch.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <WorkspaceTagSelector
          selectedTags={wizardData.tags ?? []}
          onTagsChange={handleTagsChange}
          loading={false}
          disabled={createRepositoryMutation.isPending}
          workspaceSlug={workspaceSlug}
        />
      </div>
      {onCancel && (
        <Button
          type='button'
          size='lg'
          variant='secondary'
          onClick={onCancel}
          className='mb-3'
        >
          {dict.common.cancel}
        </Button>
      )}
      <Button
        type='button'
        onClick={handleSubmit(handleCreate)}
        size='lg'
        variant='gradient'
        loading={createRepositoryMutation.isPending}
      >
        {dict.repository.createNewRepository}
      </Button>
    </div>
  );
}
