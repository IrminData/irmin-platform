'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import PathSelector from '@/components/editor/PathSelector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  itemCanBeCreated,
} from '@/utils/editorItems';

import { EditorItem } from '@/types/core/EditorItems';

type FormData = {
  name: string;
  path: string;
};

/**
 * Modal for creating a new folder.
 * Allows the user to specify a folder name and choose its path.
 *
 * @param options - Options for creating a new folder.
 * @param options.editorItems The list of current editor items (workspace context).
 * @param options.createFolder Function to create the new folder.
 * @returns JSX element for the add new folder modal.
 */
export default function AddNewFolderModal({
  editorItems,
  createFolder,
}: {
  editorItems: EditorItem[] | null;
  createFolder: (folder: EditorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  // Local state for error messages, loading status and path selector visibility.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  // Prevent multiple submissions.
  const creatingNewFolderRef = useRef(false);

  // Initialise the form with default values.
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
   * Update the folder path when the folder name changes.
   * This ensures the folder name (without extension) and the computed path are updated accordingly.
   */
  const updatePath = useCallback(() => {
    const folderName = getCorrectNameWithExtension(name, 'folder');
    const newPath = getCorrectPath(path, folderName);

    // Update the form values.
    setValue('name', folderName, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, setValue]);

  // Update the folder path whenever the name changes.
  useEffect(() => {
    updatePath();
  }, [name, updatePath]);

  /**
   * Handles the form submission to create a new folder.
   *
   * @param data The form data containing the folder name and path.
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (creatingNewFolderRef.current) return;
      creatingNewFolderRef.current = true;
      try {
        setError('');
        setLoading(true);

        const folderName = getCorrectNameWithExtension(data.name, 'folder');
        const newPath = data.path;

        // Validate if the new folder can be created.
        const canCreate = itemCanBeCreated(
          newPath,
          folderName,
          'folder',
          editorItems,
          dict
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Call the provided createFolder function to add the new folder.
        createFolder({
          type: 'folder',
          name: folderName,
          path: newPath,
          children: [],
          last_modified: new Date().toISOString(),
        });

        // Close the modal on successful creation.
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        creatingNewFolderRef.current = false;
      }
    },
    [editorItems, createFolder, dict, irminModal]
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
          rules={{ required: dict.common.fieldRequired }}
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
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <div className='flex items-center'>
              <Input type='text' disabled {...field} />
              <Button
                size='icon'
                variant='ghost'
                className='h-11 rounded-full'
                aria-label='Toggle the path selector'
                onClick={() => setShowPathSelector(!showPathSelector)}
                disabled={loading}
                icon={
                  showPathSelector ? (
                    <TbChevronUp className='inline-block' size={22} />
                  ) : (
                    <TbChevronDown className='inline-block' size={22} />
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
          editorItems={editorItems ?? []}
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
        {loading ? dict.common.loading : dict.fileNavigator.createFolder}
      </Button>
    </form>
  );
}
