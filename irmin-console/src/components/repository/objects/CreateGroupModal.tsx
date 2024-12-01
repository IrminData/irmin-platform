'use client';

import { useCallback, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

interface CreateGroupFormValues {
  repository: string;
  ref: string;
  name: string;
  path: string;
}

/**
 * UI for the create group (folder) modal.
 *
 * @param props - The component props
 * @param props.createGroup - The function to create the group
 * @param props.currentPath - The current path in the repository
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current branch/ref
 */
export default function CreateGroupModal({
  createGroup,
  currentPath,
  currentRepository,
  currentRef,
}: {
  createGroup: (name: string, path: string, ref: string) => Promise<void>;
  currentPath: string;
  currentRepository: string;
  currentRef: string;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupFormValues>({
    defaultValues: {
      repository: currentRepository,
      ref: currentRef,
      name: 'example-group',
      path: currentPath,
    },
  });

  const handleCreateGroup = useCallback(
    async (data: CreateGroupFormValues) => {
      try {
        setLoading(true);
        setError('');

        // Create the group in the repository
        await createGroup(data.name, data.path, data.ref);

        // Close the modal and show success message
        irminModal.close();
      } catch (error) {
        console.error('Failed to create group:', error);
        setError((error as Error)?.message ?? 'Could not create group');
      } finally {
        setLoading(false);
      }
    },
    [createGroup, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(handleCreateGroup)}
      className='flex flex-col gap-4'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.targetRepository}</Label>
        <Controller
          name='repository'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' disabled={!!currentRepository} {...field} />
              {errors.repository && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.repository.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.targetBranch}</Label>
        <Controller
          name='ref'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' disabled={!!currentRef} {...field} />
              {errors.ref && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.ref.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' {...field} />
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
        <Label>{dict.repository.objects.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <Input type='text' placeholder='/example/path' {...field} />
          )}
        />
      </div>
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          className='w-full'
          disabled={loading}
          type='submit'
        >
          {loading ? dict.misc.loading : dict.repository.objects.createGroup}
        </Button>
      </div>
    </form>
  );
}
