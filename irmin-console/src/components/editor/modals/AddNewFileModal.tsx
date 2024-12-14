'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  getNameWithoutExtension,
  itemCanBeCreated,
} from '@/utils/editorItems';

import {
  EditorItems,
  EditorItemsFile,
  irminFileTypes,
  IrminFileTypeWithDetails,
} from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import PathSelector from '../PathSelector';

type FormData = {
  extension: IrminFileTypeWithDetails;
  name: string;
  path: string;
};

export default function AddNewFileModal({
  editorItems,
  createFile,
}: {
  editorItems: EditorItems | null;
  createFile: (file: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  const creatingFileRef = useRef(false);

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      extension: irminFileTypes.find((a) => a.extension === 'sql')!,
      name: '',
      path: '',
    },
  });

  const extension = watch('extension');
  const name = watch('name');
  const path = watch('path');

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
  }, [extension, name, path, setValue]);

  // Update path and name whenever extension or name changes
  useEffect(() => {
    updatePathAndName();
  }, [extension, name, updatePathAndName]);

  /**
   * Create the file based on the values provided by the user
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (creatingFileRef.current) return;
      creatingFileRef.current = true;
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
          editorItems,
          dict,
          extensionValue
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }
        // Create the new file
        const newFile = {
          is_draft: false,
          workspace: editorItems?.workspace ?? '',
          contents: '',
          name: nameWithExtension,
          path: newPath,
          type: extensionValue,
        } as EditorItemsFile;
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
          rules={{ required: dict.misc.fieldRequired }}
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
            <Input type='text' disabled={loading} {...field} />
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
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <div className='flex flex-row items-center'>
              <Input type='text' disabled={true} {...field} />
              <Button
                size='icon'
                variant='ghost'
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
          editorItems={editorItems}
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
        {loading ? dict.misc.loading : dict.fileNavigator.createFile}
      </Button>
    </form>
  );
}
