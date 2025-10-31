'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import PathSelector from '@/components/editor/PathSelector';
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

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  itemCanBeCreated,
} from '@/utils/editorItems';

import type { EditorItem, IrminFileLanguage } from '@/types/core/EditorItems';
import { irminFileLanguages } from '@/types/core/EditorItems';

type FormData = {
  extension: IrminFileLanguage;
  name: string;
  path: string;
};

/**
 * Modal for creating a new file.
 * Allows the user to select the file type, specify a file name and choose the file path.
 *
 * @param options - Options for creating a new file.
 * @param options.editorItems The list of current editor items (workspace context).
 * @param options.createFile Function to create the new file.
 * @returns JSX element for the add new file modal.
 */
export default function AddNewFileModal({
  editorItems,
  createFile,
}: {
  editorItems: EditorItem[] | null;
  createFile: (file: EditorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  // Local state for error messages and loading status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  // Prevent multiple submissions
  const creatingFileRef = useRef(false);

  // Initialise the form with default values.
  // Default extension is the first item in the list of file languages.
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      // Default to Go-lang (first and primary option)
      extension: irminFileLanguages[0].value, // 'go'
      name: 'example',
      path: '/example.go',
    },
  });

  const extension = watch('extension');
  const name = watch('name');
  const path = watch('path');

  /**
   * Update the file name and path when the extension or name changes.
   * This ensures that the file name always includes the correct extension and the path is updated accordingly.
   */
  const updatePathAndName = useCallback(() => {
    const nameWithExtension = getCorrectNameWithExtension(
      name,
      'file',
      extension
    );
    const newPath = getCorrectPath(path, nameWithExtension);

    // Update the form values: name without extension and the corrected path.
    setValue('name', nameWithExtension, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [extension, name, path, setValue]);

  // Recalculate the file name and path whenever the name or extension changes.
  useEffect(() => {
    updatePathAndName();
  }, [extension, name, updatePathAndName]);

  /**
   * Handles the form submission to create a new file.
   *
   * @param data The form data containing the selected extension, file name and file path.
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (creatingFileRef.current) return;
      creatingFileRef.current = true;
      try {
        setError('');
        setLoading(true);

        const nameWithExtension = getCorrectNameWithExtension(
          data.name,
          'file',
          data.extension
        );
        const newPath = data.path;

        // Validate if the new file can be created.
        const canCreate = itemCanBeCreated(
          newPath,
          nameWithExtension,
          'file',
          editorItems,
          dict
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Call the provided createFile function to add the new file.
        createFile({
          type: 'file',
          name: nameWithExtension,
          path: newPath,
          language: data.extension,
          content: '',
          last_modified: new Date().toISOString(),
        });

        // Close the modal on successful creation.
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        creatingFileRef.current = false;
      }
    },
    [editorItems, createFile, dict, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='add-new-file-modal'
    >
      <div>
        <Controller
          name='extension'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => {
            const selectedLanguage = irminFileLanguages.find(
              (lang) => lang.value === field.value
            );
            return (
              <Select
                disabled={loading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {selectedLanguage?.label || 'Select file type'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {irminFileLanguages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFileName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} disabled={loading} />
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
        <Label>{dict.fileNavigator.newFilePath}</Label>
        <Controller
          name='path'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <div className='flex flex-row items-center'>
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
          itemName={getCorrectNameWithExtension(name, 'file', extension)}
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
      {error && error.length > 0 && (
        <div className='text-destructive'>{error}</div>
      )}
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
