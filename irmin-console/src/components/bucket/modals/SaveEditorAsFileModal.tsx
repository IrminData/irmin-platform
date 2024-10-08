'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

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

import {
  Bucket,
  BucketFile,
  IrminFileType,
  irminFileTypes,
  IrminFileTypeWithDetails,
} from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import PathSelector from '../PathSelector';

/**
 * Content for the "Save As File" modal in the editor
 * Allows the user to create a new file
 *
 * @param options - The options for the item to create
 * @param options.defaultName - The default name for the new file
 * @param options.defaultPath - The default path for the new file
 * @param options.defaultType - The default type for the new file
 * @param options.contents - The contents of the new file
 * @param options.bucket - The bucket the item is in
 * @param options.createFile - Function to create a new file
 */
export default function SaveEditorAsFileModal({
  defaultName,
  defaultPath,
  defaultType,
  contents,
  bucket,
  createFile,
}: {
  defaultName: string;
  defaultPath: string;
  defaultType: IrminFileType;
  contents: string;
  bucket: Bucket | null;
  createFile: (file: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  const creationInProgress = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<{
    name: string;
    path: string;
    extension: IrminFileTypeWithDetails;
  }>({
    defaultValues: {
      name: getNameWithoutExtension(defaultName),
      path: defaultPath,
      extension:
        irminFileTypes.find((type) => type.extension === defaultType) ||
        irminFileTypes[0],
    },
  });

  const name = watch('name');
  const path = watch('path');
  const extension = watch('extension');

  /**
   * Update the path and name when the extension or name changes
   */
  const updatePathAndName = useCallback(() => {
    const extensionValue = extension.extension;
    const nameWithExtension = getCorrectNameWithExtension(
      name,
      'file',
      extensionValue
    );
    const newPath = getCorrectPath(path, nameWithExtension);

    // Update the name without extension and path
    setValue('name', getNameWithoutExtension(nameWithExtension), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, extension, setValue]);

  // Update path and name whenever name or extension changes
  useEffect(() => {
    updatePathAndName();
  }, [name, extension, updatePathAndName]);

  /**
   * Create the new item based on the values provided by the user
   */
  const onSubmit = useCallback(
    async (data: {
      name: string;
      path: string;
      extension: IrminFileTypeWithDetails;
    }) => {
      if (creationInProgress.current) return;
      creationInProgress.current = true;
      try {
        setError('');
        setLoading(true);

        const extensionValue = data.extension.extension;
        const nameWithExtension = getCorrectNameWithExtension(
          data.name,
          'file',
          extensionValue
        );
        const newPath = data.path;

        // Ensure the item can be created
        const canCreate = itemCanBeCreated(
          newPath,
          nameWithExtension,
          'file',
          bucket,
          dict,
          extensionValue
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Create the new file
        const newFile = {
          is_draft: false,
          bucket: bucket?.slug ?? '',
          contents: contents,
          name: nameWithExtension,
          path: newPath,
          type: extensionValue,
        } as BucketFile;
        createFile({
          original: null,
          current: newFile,
          type: 'file',
        });

        // Close the modal after creation
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        creationInProgress.current = false;
      }
    },
    [bucket, contents, createFile, dict, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='save-editor-as-file-modal'
    >
      <div>
        <Controller
          name='extension'
          control={control}
          render={({ field }) => (
            <ReactSelect
              {...field}
              aria-label='Select the type of the file'
              isDisabled={loading}
              options={irminFileTypes}
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.extension}
              className='react-select-container'
              classNamePrefix='react-select'
            />
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.fileNavigator.newFileName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
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
      </div>
      {showPathSelector && (
        <PathSelector
          bucket={bucket}
          itemName={getCorrectNameWithExtension(
            name,
            'file',
            extension.extension
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
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={loading}
      >
        {loading ? dict.misc.loading : dict.fileNavigator.createFile}
      </Button>
    </form>
  );
}
