'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { constructObjectUrlPath } from '@/utils/constructObjectUrlPath';

import type { RepositoryObject } from '@/types/core/RepositoryObject';

interface MoveRenameFormValues {
  path: string;
  name: string;
}

/**
 * UI for the move/rename modal.
 *
 * @param props - The component props
 * @param props.moveObject - The function to move the object
 * @param props.selectedObject - The selected object being moved/renamed
 */
export default function MoveRenameObjectModal({
  moveObject,
  selectedObject,
}: {
  moveObject: (oldPath: string, newPath: string) => Promise<void>;
  selectedObject: RepositoryObject;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<MoveRenameFormValues>({
    defaultValues: {
      path: selectedObject.path,
      name: selectedObject.name,
    },
  });

  // Keep track of current field values
  const nameValue = useWatch({ control, name: 'name' });
  const pathValue = useWatch({ control, name: 'path' });

  // Sync name ↔ path, based on which was edited last
  const lastChanged = useRef<'name' | 'path' | null>(null);
  useEffect(() => {
    if (lastChanged.current === 'name') {
      // user changed name, so update path
      setValue('path', `/${nameValue}`);
    } else if (lastChanged.current === 'path') {
      // user changed path, so update name
      const newName = pathValue.split('/').pop() ?? '';
      setValue('name', newName);
    }
    // reset so we only do this once per edit
    lastChanged.current = null;
  }, [nameValue, pathValue, setValue]);

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
        <Label>{dict.repository.objects.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                disabled={loading}
                onChange={(e) => {
                  field.onChange(e);
                  lastChanged.current = 'name';
                }}
              />
              {errors.name && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.name.message}
                </p>
              )}
            </>
          )}
        />
        <p className='text-xs opacity-70'>
          {dict.repository.objects.currentName}: {selectedObject.name}
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                disabled={loading}
                onChange={(e) => {
                  field.onChange(e);
                  lastChanged.current = 'path';
                }}
              />
              {errors.path && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.path.message}
                </p>
              )}
            </>
          )}
        />
        <p className='text-xs opacity-70'>
          {dict.repository.objects.currentPath}: {selectedObject.path}
        </p>
      </div>
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          size='sm'
          className='w-full'
          loading={loading}
          type='submit'
        >
          {dict.repository.objects.moveOrRename}
        </Button>
      </div>
    </form>
  );
}
