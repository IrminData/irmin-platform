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
  EditorItemsFolder,
  irminFileTypes,
  IrminFileTypeWithDetails,
} from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

import PathSelector from '../PathSelector';

type FormData = {
  name: string;
  path: string;
  extension?: IrminFileTypeWithDetails;
};

/**
 * Content for the "Rename or move item" modal
 * Allows the user to change the name, path, and type of the item
 *
 * @param options - The options for the item to rename or move
 * @param options.item The item to rename
 * @param options.editorItems The editorItems the item is in
 * @param options.updateFile Function to update a file
 * @param options.updateFolder Function to update a folder
 */
export default function RenameOrMoveItemModal({
  item,
  editorItems,
  updateFile,
  updateFolder,
}: {
  item: FileNavigatorItem;
  editorItems: EditorItems | null;
  updateFile: (file: FileNavigatorItem) => void;
  updateFolder: (folder: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  const updatingRef = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: getNameWithoutExtension(item.current?.name || ''),
      path: item.current?.path || '',
      extension:
        item.type === 'file' && item.current?.type
          ? irminFileTypes.find((type) => type.extension === item.current?.type)
          : undefined,
    },
  });

  const name = watch('name');
  const path = watch('path');
  const extension = watch('extension');

  /**
   * Update the path and name when the extension or name changes
   */
  const updatePathAndName = useCallback(() => {
    const extensionValue =
      item.type === 'file' ? extension?.extension : undefined;
    const nameWithExtension = getCorrectNameWithExtension(
      name,
      item.type,
      extensionValue
    );
    const newPath = getCorrectPath(path, nameWithExtension);

    // Update the name without extension and path
    setValue('name', getNameWithoutExtension(nameWithExtension), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, extension, item.type, setValue]);

  // Update path and name whenever name or extension changes
  useEffect(() => {
    updatePathAndName();
  }, [name, extension, updatePathAndName]);

  /**
   * Update the file/folder based on the values provided by the user
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (updatingRef.current) return;
      updatingRef.current = true;
      try {
        setError('');
        setLoading(true);

        const extensionValue =
          item.type === 'file' ? data.extension?.extension : undefined;
        const nameWithExtension = getCorrectNameWithExtension(
          data.name,
          item.type,
          extensionValue
        );
        const newPath = data.path;

        // Ensure the item can be created
        const canCreate = itemCanBeCreated(
          newPath,
          nameWithExtension,
          item.type,
          editorItems,
          dict,
          extensionValue
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Update the item
        if (item.type === 'file') {
          const newFile = {
            ...item.current,
            name: nameWithExtension,
            path: newPath,
            type: extensionValue,
          } as EditorItemsFile;
          updateFile({
            ...item,
            current: newFile,
          });
        } else if (item.type === 'folder') {
          const newFolder = {
            ...item.current,
            name: nameWithExtension,
            path: newPath,
          } as EditorItemsFolder;
          updateFolder({
            ...item,
            current: newFolder,
          });
        }

        // Close the modal after updating
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        updatingRef.current = false;
      }
    },
    [item, editorItems, dict, updateFile, updateFolder, irminModal]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='rename-or-move-item-modal'
    >
      {item.type === 'file' && (
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
          <p className='mt-1 pl-1 text-xs text-gray-400'>
            {dict.fileNavigator.original}:{' '}
            {(item.original as EditorItemsFile)?.type ?? ''}
          </p>
        </div>
      )}
      <div className='flex flex-col gap-2'>
        <Label>
          {item.type === 'file'
            ? dict.fileNavigator.newNameOfTheFile
            : dict.fileNavigator.newNameOfTheFolder}
        </Label>
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
        <p className='mt-1 pl-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.name ?? ''}
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>
          {item.type === 'file'
            ? dict.fileNavigator.newPathOfTheFile
            : dict.fileNavigator.newPathOfTheFolder}
        </Label>
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
                    <IoChevronUp className='inline-block' size={22} />
                  ) : (
                    <IoChevronDown className='inline-block' size={22} />
                  )
                }
              />
            </div>
          )}
        />
        <p className='mt-1 pl-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.path ?? ''}
        </p>
      </div>
      {showPathSelector && (
        <PathSelector
          editorItems={editorItems}
          itemName={getCorrectNameWithExtension(
            name,
            item.type,
            item.type === 'file' ? extension?.extension : undefined
          )}
          originalItemPath={item.original?.path ?? null}
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
        {loading
          ? dict.common.loading
          : item.type === 'folder'
            ? dict.fileNavigator.updateFolder
            : dict.fileNavigator.updateFile}
      </Button>
    </form>
  );
}
