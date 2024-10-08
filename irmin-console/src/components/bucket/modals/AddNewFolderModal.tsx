'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  getNameWithoutExtension,
  itemCanBeCreated,
} from '@/utils/bucket';

import { Bucket, BucketFolder } from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import PathSelector from '../PathSelector';

type FormData = {
  name: string;
  path: string;
};

export default function AddNewFolderModal({
  bucket,
  createFolder,
}: {
  bucket: Bucket | null;
  createFolder: (folder: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  const creatingNewFolderRef = useRef(false);

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      path: '',
    },
  });

  const name = watch('name');
  const path = watch('path');

  /**
   * Update the path when the name changes
   */
  const updatePath = useCallback(() => {
    const nameWithExtension = getCorrectNameWithExtension(name, 'folder');
    const newPath = getCorrectPath(path, nameWithExtension);

    // Update the name without extension and path
    setValue('name', getNameWithoutExtension(nameWithExtension), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, setValue]);

  // Update path whenever the name changes
  useEffect(() => {
    updatePath();
  }, [name, updatePath]);

  /**
   * Create the folder based on the values provided by the user
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (creatingNewFolderRef.current) return;
      creatingNewFolderRef.current = true;
      try {
        setError('');
        setLoading(true);

        const nameWithExtension = getCorrectNameWithExtension(
          data.name,
          'folder'
        );
        const newPath = data.path;

        // Ensure the item can be created
        const canCreate = itemCanBeCreated(
          newPath,
          nameWithExtension,
          'folder',
          bucket,
          dict
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }
        // Create the new folder
        const newFolder = {
          bucket: bucket?.slug ?? '',
          name: nameWithExtension,
          path: newPath,
        } as BucketFolder;
        createFolder({
          original: null,
          current: newFolder,
          children: [],
          type: 'folder',
        });
        // Close the modal after creation
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        creatingNewFolderRef.current = false;
      }
    },
    [bucket, createFolder, dict, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='add-new-folder-modal'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFolderName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <Input type='text' disabled={loading} {...field} />
          )}
        />
        {errors.name && (
          <p className='mt-1 text-xs text-red-600'>{errors.name.message}</p>
        )}
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFolderPath}</Label>
        <Controller
          name='path'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <div className='flex items-center'>
              <Input type='text' disabled {...field} />
              <Button
                size='icon'
                variant='secondary'
                className='h-11 rounded-full'
                aria-label='Toggle the path selector'
                onClick={() => setShowPathSelector(!showPathSelector)}
                disabled={loading}
                icon={
                  showPathSelector ? (
                    <IoChevronUp className='inline-block' size={22} />
                  ) : (
                    <IoChevronDown className='inline-block' size={22} />
                  )
                }
              />
            </div>
          )}
        />
        {errors.path && (
          <p className='mt-1 text-xs text-red-600'>{errors.path.message}</p>
        )}
      </div>
      {showPathSelector && (
        <PathSelector
          bucket={bucket}
          itemName={getCorrectNameWithExtension(name, 'folder')}
          originalItemPath={null}
          currentSelected={path}
          onSelectPath={(selectedPath: string) => {
            setValue('path', selectedPath, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }}
        />
      )}
      {error && <div className='text-destructive'>{error}</div>}
      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={loading}
      >
        {loading ? dict.misc.loading : dict.fileNavigator.createFolder}
      </Button>
    </form>
  );
}
