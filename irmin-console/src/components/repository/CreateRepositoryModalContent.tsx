'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/useRepositories';

/**
 * Modal content to create a new repository.
 *
 * @param props - The props
 * @param props.closeModal - Callback to close the modal
 */
export default function CreateRepositoryModalContent({
  closeModal,
}: {
  closeModal: () => void;
}) {
  const { dict } = useLocale();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      default_branch: 'main',
    },
  });

  const { createRepositoryMutation } = useRepositories();

  const handleCreate = useCallback(
    async (data: {
      name: string;
      description: string;
      default_branch: string;
    }) => {
      try {
        await createRepositoryMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: '',
          default_branch: data.default_branch,
          isImmutable: false,
        });
        closeModal();
        reset();
      } catch (error) {
        console.error(error);
      }
    },
    [closeModal, reset, createRepositoryMutation]
  );

  return (
    <form
      id='create-repository-modal-content'
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
