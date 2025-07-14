'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

import PathSelector from '@/components/editor/PathSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  getLanguageFromFilename,
  itemCanBeCreated,
} from '@/utils/editorItems';

import type { EditorItem } from '@/types/core/EditorItems';
import type { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

type FormData = {
  name: string;
  path: string;
};

/**
 * Content for the "Rename or move item" modal
 * Allows the user to change the name, path, and type of the item
 *
 * @param options - The options for the item to rename or move
 * @param options.item The item to rename
 * @param options.editorItems The editorItems the item is in
 * @param options.updateItem Function to update an item
 */
export default function RenameOrMoveItemModal({
  item,
  editorItems,
  updateItem,
}: {
  item: FileNavigatorItem;
  editorItems: EditorItem[];
  updateItem: (item: FileNavigatorItem) => void;
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
      name: item.current?.name || '',
      path: item.current?.path || '',
    },
  });

  const name = watch('name');
  const path = watch('path');

  /**
   * Update the path and name when the extension or name changes
   */
  const updatePathAndName = useCallback(() => {
    if (!item.current) return;
    const newPath = getCorrectPath(path, name);

    // Update the path
    setValue('path', newPath, { shouldValidate: true, shouldDirty: true });
  }, [name, path, setValue, item]);

  // Update path and name whenever name or extension changes
  useEffect(() => {
    updatePathAndName();
  }, [name, updatePathAndName]);

  /**
   * Update the file/folder based on the values provided by the user
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (updatingRef.current) return;
      if (!item.current) return;
      updatingRef.current = true;
      try {
        setError('');
        setLoading(true);

        const newPath = data.path;

        // Ensure the item can be created
        const canCreate = itemCanBeCreated(
          newPath,
          data.name,
          item.current.type,
          editorItems,
          dict
        );
        if (!canCreate.canCreate) {
          throw new Error(canCreate.reason);
        }

        // Update the item
        if (item.current.type === 'file') {
          const newFile: EditorItem = {
            ...item.current,
            name: data.name,
            path: newPath,
            type: 'file',
          };
          updateItem({
            ...item,
            current: newFile,
          });
        } else if (item.current.type === 'folder') {
          const newFolder: EditorItem = {
            ...item.current,
            name: data.name,
            path: newPath,
          };
          updateItem({
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
    [item, editorItems, dict, updateItem, irminModal]
  );

  if (!item.current) return <></>;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='rename-or-move-item-modal'
    >
      <div className='flex flex-col gap-2'>
        <Label>
          {item.current.type === 'file'
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
          {item.current.type === 'file'
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
                    <TbChevronUp className='inline-block' size={22} />
                  ) : (
                    <TbChevronDown className='inline-block' size={22} />
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
            getLanguageFromFilename(name)
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
          : item.current.type === 'folder'
            ? dict.fileNavigator.updateFolder
            : dict.fileNavigator.updateFile}
      </Button>
    </form>
  );
}
