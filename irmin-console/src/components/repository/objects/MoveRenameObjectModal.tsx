'use client';

import { useCallback, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { constructObjectUrlPath } from '@/utils/constructObjectUrlPath';

import { Object } from '@/types/core/Object';

interface MoveRenameFormValues {
  path: string;
  name: string;
}

/**
 * UI for the move/rename modal.
 *
 * @param props - The component props
 * @param props.moveObject - The function to move the object
 * @param props.currentPath - The current path in the repository
 * @param props.selectedObject - The selected object being moved/renamed
 */
export default function MoveRenameObjectModal({
  moveObject,
  currentPath,
  selectedObject,
}: {
  moveObject: (oldPath: string, newPath: string) => Promise<void>;
  currentPath: string;
  selectedObject: Object;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MoveRenameFormValues>({
    defaultValues: {
      path: currentPath ?? '/',
      name: selectedObject.name,
    },
  });

  // Handle move/rename operation
  const handleMoveRename = useCallback(
    async (data: MoveRenameFormValues) => {
      try {
        setLoading(true);
        setError('');

        // Construct the new path for the object
        const urlFormattedPath = constructObjectUrlPath(data.path, data.name);

        // Move/rename object
        await moveObject(selectedObject.path, urlFormattedPath);

        // Close the modal and show success message
        irminModal.close();
      } catch (error) {
        console.error('Failed to move/rename object:', error);
        setError((error as Error)?.message ?? 'Could not move/rename object');
      } finally {
        setLoading(false);
      }
    },
    [moveObject, selectedObject, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(handleMoveRename)}
      className='flex flex-col gap-4'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' {...field} />
              {errors.path && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.path.message}
                </p>
              )}
            </>
          )}
        />
        <p className='text-xs opacity-70'>
          {dict.repository.objects.currentPath}:{' '}
          {selectedObject.path.substring(
            0,
            selectedObject.path.lastIndexOf('/')
          ) || '/'}
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
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
        <p className='text-xs opacity-70'>
          {dict.repository.objects.currentName}:{' '}
          {selectedObject.name ?? 'example.txt'}
        </p>
      </div>
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          size='sm'
          className='w-full'
          disabled={loading}
          type='submit'
        >
          {loading ? dict.common.loading : dict.repository.objects.moveOrRename}
        </Button>
      </div>
    </form>
  );
}
