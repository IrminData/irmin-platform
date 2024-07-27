'use client';

import React, { useState } from 'react';

import { itemCanBeCreated, updateFieldValues } from '@/lib/utils/bucketUtils';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Content for the "Rename or move item" modal
 * Allows to the user to change the name, path and type of the item
 *
 * @param options - The options for the item to rename or move
 * @param options.item The item to rename
 * @param options.bucket The bucket the item is in
 * @param options.updateFile Function to update a file
 * @param options.updateFolder Function to update a folder
 *
 * @returns The modal content
 */
export default function RenameOrMoveItemModalContent({
  item,
  bucket,
  updateFile,
  updateFolder,
}: {
  item: FileNavigatorItem;
  bucket: Bucket | null;
  updateFile: (file: FileNavigatorItem) => void;
  updateFolder: (folder: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState({
    bucket: bucket?.slug ?? '',
    name: '',
    path: '',
    type: 'sql',
    contents: '',
    is_draft: false,
    ...item.current,
  });
  const type = item.type;

  const continueRename = () => {
    if (loading) return;
    try {
      setLoading(true);
      // Make sure that can be created
      const canCreate = itemCanBeCreated(
        itemData.path,
        itemData.name,
        type,
        bucket,
        dict,
        itemData.type
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Update the item
      if (type === 'file') {
        updateFile({
          original: item.original,
          current: itemData,
          type,
        } as FileNavigatorItem);
      } else {
        updateFolder({
          original: item.original,
          current: itemData as BucketFolder,
          type,
        } as FileNavigatorItem);
      }
      // Close the modal after updating
      irminModal.close();
    } catch (error) {
      console.error(error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {type === 'file' && (
        <div className='py-2'>
          <select
            id='type-select'
            disabled={loading}
            className='w-full rounded border p-2'
            defaultValue={itemData.type}
            onChange={(e) => {
              // Get and set the correct name, path and extension
              const { name, path, extension } = updateFieldValues({
                type: type,
                name: itemData.name,
                path: itemData.path,
                extension: e.target.value,
              });
              setItemData({ ...itemData, path, name, type: extension });
            }}
          >
            <option value='sql'>SQL</option>
            <option value='js'>JavaScript</option>
            <option value='py'>Python</option>
          </select>
          <p className='mt-1 text-xs text-gray-400'>
            {dict.fileNavigator.original}:{' '}
            {(item.original as BucketFile)?.type ?? ''}
          </p>
        </div>
      )}
      <div className='py-2'>
        <label className='mb-1'>
          {type === 'file'
            ? dict.fileNavigator.newNameOfTheFile
            : dict.fileNavigator.newNameOfTheFolder}
        </label>
        <input
          id='name-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2'
          defaultValue={itemData.name}
          onChange={(e) => {
            // Get the cursor position
            const cursorPosition = e.target.selectionStart;
            // Get and set the correct name, path and extension
            const { name, path } = updateFieldValues({
              type: type,
              name: e.target.value,
              path: itemData.path,
              extension: itemData.type,
            });
            setItemData({ ...itemData, path, name });
            // Restore the cursor position
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }}
        />
        <p className='mt-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.name ?? ''}
        </p>
      </div>
      <div className='py-2'>
        <label className='mb-1'>
          {type === 'file'
            ? dict.fileNavigator.newPathOfTheFile
            : dict.fileNavigator.newPathOfTheFolder}
        </label>
        <input
          id='path-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2'
          defaultValue={itemData.path}
          onChange={(e) => {
            // Get the cursor position
            const cursorPosition = e.target.selectionStart;
            // Get and set the correct name, path and extension
            const { name, path } = updateFieldValues({
              type: type,
              name: itemData.name,
              path: e.target.value,
              extension: itemData.type,
            });
            setItemData({ ...itemData, path, name });
            // Restore the cursor position
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }}
        />
        <p className='mt-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.path ?? ''}
        </p>
      </div>
      {error && error.length > 0 && (
        <div className='py-2 text-red-800'>{error}</div>
      )}
      <div className='py-2'>
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          className='w-full'
          onClick={continueRename}
          disabled={loading}
        >
          {loading
            ? dict.misc.loading
            : itemData.type === 'folder'
              ? dict.fileNavigator.updateFolder
              : dict.fileNavigator.updateFile}
        </Button>
      </div>
    </div>
  );
}
