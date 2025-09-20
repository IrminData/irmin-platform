'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/api';

import type { RepositoryWizardData } from '../types';

/**
 * Step component for configuring repository details
 */
export default function ConfigureRepositoryStep({
  wizardData,
  updateWizardData,
  goNext,
}: {
  wizardData: RepositoryWizardData;
  updateWizardData: (updates: Partial<RepositoryWizardData>) => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();

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

  const handleCreate = useCallback(
    async (data: RepositoryWizardData) => {
      try {
        await createRepositoryMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: '',
          default_branch: data.default_branch,
          isImmutable: false,
        });
        updateWizardData(data);
        goNext();
      } catch (error) {
        console.error(error);
      }
    },
    [createRepositoryMutation, updateWizardData, goNext]
  );

  return (
    <form
      onSubmit={handleSubmit(handleCreate)}
      className='flex flex-col gap-4 px-4 py-8'
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
        <Label>{dict.common.description}</Label>
        <Controller
          name='description'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
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
      <Button
        type='submit'
        size='lg'
        variant='gradient'
        loading={createRepositoryMutation.isPending}
      >
        {dict.repository.createNewRepository}
      </Button>
    </form>
  );
}
