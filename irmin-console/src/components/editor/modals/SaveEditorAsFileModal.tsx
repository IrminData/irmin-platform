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
  getLanguageFromFilename,
  itemCanBeCreated,
} from '@/utils/editorItems';

import { EditorItem } from '@/types/core/EditorItems';

type FormData = {
  name: string;
  path: string;
};

/**
 * Modal for saving the editor contents as a new file.
 * This modal allows the user to specify a file name, choose a file type and select the file path.
 *
 * @param options - Options for saving the file.
 * @param options.defaultName The default file name.
 * @param options.defaultPath The default file path.
 * @param options.contents The contents of the new file.
 * @param options.editorItems The current editor items (workspace context).
 * @param options.createFile Function to create the new file.
 * @returns JSX element for the "Save as File" modal.
 */
export default function SaveEditorAsFileModal({
  defaultName,
  defaultPath,
  contents,
  editorItems,
  createFile,
}: {
  defaultName: string;
  defaultPath: string;
  contents: string;
  editorItems: EditorItem[] | null;
  createFile: (file: EditorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  // Local state for error handling, loading status and path selector visibility
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  // Prevent multiple submissions
  const creationInProgress = useRef(false);

  // Initialise the form with default values
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: defaultName,
      path: defaultPath,
    },
  });

  const name = watch('name');
  const path = watch('path');

  /**
   * Update the file name and path whenever the name or extension changes.
   * This ensures that the file name always contains the correct extension and the path is updated accordingly.
   */
  const updatePathAndName = useCallback(() => {
    const newPath = getCorrectPath(path, name);
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, setValue]);

  // Recalculate file name and path when name or extension changes.
  useEffect(() => {
    updatePathAndName();
  }, [name, updatePathAndName]);

  /**
   * Handles the submission of the "Save as File" modal.
   *
   * @param data The form data containing the file name, path and selected file type.
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (creationInProgress.current) return;
      creationInProgress.current = true;
      try {
        setError('');
        setLoading(true);

        const newPath = data.path;

        // Validate if the new file can be created.
        const canCreate = itemCanBeCreated(
          newPath,
          data.name,
          'file',
          editorItems,
          dict
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Call the createFile function to add the new file.
        createFile({
          type: 'file',
          name: data.name,
          path: newPath,
          language: getLanguageFromFilename(newPath),
          content: contents,
          last_modified: new Date().toISOString(),
        });

        // Close the modal on successful creation.
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        creationInProgress.current = false;
      }
    },
    [contents, editorItems, createFile, dict, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='save-editor-as-file-modal'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFileName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <Input {...field} type='text' disabled={loading} />
          )}
        />
        {errors.name && (
          <p className='mt-1 text-xs text-red-600'>{errors.name.message}</p>
        )}
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFilePath}</Label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <div className='flex items-center'>
              <Input {...field} type='text' disabled />
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
      </div>
      {showPathSelector && (
        <PathSelector
          editorItems={editorItems ?? []}
          itemName={getCorrectNameWithExtension(
            name,
            'file',
            getLanguageFromFilename(name)
          )}
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
      {error && <div className='text-destructive py-2'>{error}</div>}
      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={loading}
      >
        {loading ? dict.common.loading : dict.fileNavigator.createFile}
      </Button>
    </form>
  );
}
