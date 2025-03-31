'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/editor/PathSelector';
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
  EditorItem,
  IrminFileLanguage,
  irminFileLanguages,
} from '@/types/core/EditorItems';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

type FormData = {
  name: string;
  path: string;
  extension?: IrminFileLanguage;
};

/**
 * Content for the "Copy item" modal.
 * Allows the user to copy an item by selecting a new name, path and type (for files).
 *
 * @param options - The options for the item to copy
 * @param options.item The item to copy
 * @param options.editorItems The list of editor items in which the new copy will be created
 * @param options.copyItem Function to copy an item
 */
export default function CopyItemModal({
  item,
  editorItems,
  copyItem,
}: {
  item: FileNavigatorItem;
  editorItems: EditorItem[];
  copyItem: (item: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);

  // Prevent multiple submissions
  const copyingRef = useRef(false);

  // Set default values for the copy modal
  const defaultName = `${getNameWithoutExtension(item.current?.name || '')} copy`;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: defaultName,
      path: item.current?.path || '',
      extension: item.current?.language,
    },
  });

  const name = watch('name');
  const path = watch('path');
  const extension = watch('extension');

  /**
   * Update the path and name when the name or extension changes.
   * For files, it adds the appropriate extension.
   */
  const updatePathAndName = useCallback(() => {
    if (!item.current) return;
    const extensionValue = item.current.type === 'file' ? extension : undefined;
    const nameWithExtension = getCorrectNameWithExtension(
      name,
      item.current.type,
      extensionValue
    );
    const newPath = getCorrectPath(path, nameWithExtension);

    // Update the name without extension and the path
    setValue('name', getNameWithoutExtension(nameWithExtension), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, extension, item.current?.type, setValue]);

  // Update the path and name whenever name or extension changes
  useEffect(() => {
    updatePathAndName();
  }, [name, extension, updatePathAndName]);

  /**
   * Copy the file or folder based on the values provided by the user.
   *
   * @param data - The data submitted from the form
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (copyingRef.current) return;
      if (!item.current) return;
      copyingRef.current = true;
      try {
        setError('');
        setLoading(true);

        const extensionValue =
          item.current.type === 'file' ? data.extension : undefined;
        const nameWithExtension = getCorrectNameWithExtension(
          data.name,
          item.current.type,
          extensionValue
        );
        const newPath = data.path;

        // Ensure the new copy can be created
        const canCreate = itemCanBeCreated(
          newPath,
          nameWithExtension,
          item.current.type,
          editorItems,
          dict,
          extensionValue
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Create the new copy of the item
        if (item.current.type === 'file') {
          const newFile: EditorItem = {
            ...item.current,
            name: nameWithExtension,
            path: newPath,
            type: 'file',
          };
          copyItem({
            ...item,
            current: newFile,
          });
        } else if (item.current.type === 'folder') {
          const newFolder: EditorItem = {
            ...item.current,
            name: nameWithExtension,
            path: newPath,
            type: 'folder',
          };
          copyItem({
            ...item,
            current: newFolder,
          });
        }

        // Close the modal after copying the item
        irminModal.close();
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
        copyingRef.current = false;
      }
    },
    [item, editorItems, dict, copyItem, irminModal]
  );

  if (!item.current) return <></>;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='copy-item-modal'
    >
      {item.current.type === 'file' && (
        <div>
          <Controller
            name='extension'
            control={control}
            render={({ field }) => (
              <ReactSelect
                {...field}
                aria-label='Select the type of the file'
                isDisabled={loading}
                options={irminFileLanguages.map((lang) => lang.value)}
                getOptionLabel={(lang) =>
                  irminFileLanguages.find((l) => l.value === lang)?.label ??
                  lang
                }
                className='react-select-container'
                classNamePrefix='react-select'
              />
            )}
          />
          <p className='mt-1 pl-1 text-xs text-gray-400'>
            {dict.fileNavigator.original}: {item.current.language ?? ''}
          </p>
        </div>
      )}
      <div className='flex flex-col gap-2'>
        <Label>
          {item.current.type === 'file'
            ? dict.fileNavigator.newFileName
            : dict.fileNavigator.newFolderName}
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
          {item.current.type === 'file'
            ? dict.fileNavigator.newFilePath
            : dict.fileNavigator.newFolderPath}
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
            item.current.type,
            extension
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
      {error && <div className='text-destructive py-2'>{error}</div>}
      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={loading}
      >
        {loading
          ? dict.common.loading
          : item.current.type === 'folder'
            ? dict.fileNavigator.copyFolder
            : dict.fileNavigator.copyFile}
      </Button>
    </form>
  );
}
