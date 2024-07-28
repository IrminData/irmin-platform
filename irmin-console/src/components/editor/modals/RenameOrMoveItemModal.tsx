'use client';

import React, { useState } from 'react';

import { itemCanBeCreated, updateFieldValues } from '@/lib/utils/bucketUtils';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/editor/pathSelector';
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
export default function RenameOrMoveItemModal({
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
  const [showPathSelector, setShowPathSelector] = useState(true);
  const [newItemData, setNewItemData] = useState({
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
        newItemData.path,
        newItemData.name,
        type,
        bucket,
        dict,
        newItemData.type
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Update the item
      if (type === 'file') {
        updateFile({
          original: item.original,
          current: newItemData,
          type,
        } as FileNavigatorItem);
      } else {
        updateFolder({
          original: item.original,
          current: newItemData as BucketFolder,
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
        <div className='pb-2'>
          <div className='w-[150px] rounded border'>
            <select
              id='type-select'
              disabled={loading}
              className='h-6 w-[146px] rounded border border-r-4 border-white bg-white px-2 py-1 text-xs'
              aria-label='Select the type of the file'
              defaultValue={newItemData.type}
              onChange={(e) => {
                // Get and set the correct name, path and extension
                const { name, path, extension } = updateFieldValues({
                  type: type,
                  name: newItemData.name,
                  path: newItemData.path,
                  extension: e.target.value,
                });
                setNewItemData({ ...newItemData, path, name, type: extension });
              }}
            >
              <option value='sql'>SQL</option>
              <option value='js'>JavaScript</option>
              <option value='py'>Python</option>
            </select>
          </div>
          <p className='mt-1 pl-1 text-xs text-gray-400'>
            {dict.fileNavigator.original}:{' '}
            {(item.original as BucketFile)?.type ?? ''}
          </p>
        </div>
      )}
      <div className='pb-3'>
        <label className='text-xs'>
          {type === 'file'
            ? dict.fileNavigator.newNameOfTheFile
            : dict.fileNavigator.newNameOfTheFolder}
        </label>
        <input
          id='name-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2 text-sm placeholder:text-gray-400'
          placeholder='example_name'
          defaultValue={newItemData.name}
          onChange={(e) => {
            // Get the cursor position
            const cursorPosition = e.target.selectionStart;
            // Get and set the correct name, path and extension
            const { name, path } = updateFieldValues({
              type: type,
              name: e.target.value,
              path: newItemData.path,
              extension: newItemData.type,
            });
            setNewItemData({ ...newItemData, path, name });
            // Restore the cursor position
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }}
        />
        <p className='mt-1 pl-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.name ?? ''}
        </p>
      </div>
      <div className='pb-3'>
        <label className='text-xs'>
          {type === 'file'
            ? dict.fileNavigator.newPathOfTheFile
            : dict.fileNavigator.newPathOfTheFolder}
        </label>
        <div className='flex'>
          <input
            id='path-input'
            disabled={true}
            type='text'
            className='w-full rounded border bg-gray-100 p-2 text-sm placeholder:text-gray-300'
            placeholder='/folder/example/path'
            value={newItemData.path}
          />
          <Button
            variant='icon'
            colorScheme='secondary'
            size='sm'
            className='m-0 ml-auto p-0 pl-2'
            ariaLabel='Toggle the path selector'
            onClick={() => setShowPathSelector(!showPathSelector)}
            disabled={loading}
          >
            {!showPathSelector && (
              <IoChevronDown className='inline-block' size={24} />
            )}
            {showPathSelector && (
              <IoChevronUp className='inline-block' size={24} />
            )}
          </Button>
        </div>
        <p className='mt-1 pl-1 text-xs text-gray-400'>
          {dict.fileNavigator.original}: {item.original?.path ?? ''}
        </p>
      </div>
      {showPathSelector && (
        <PathSelector
          bucket={bucket}
          itemName={newItemData.name}
          originalItemPath={item.original?.path ?? null}
          currentSelected={newItemData.path}
          onSelectPath={(selectedPath: string) => {
            // Get and set the correct name, path and extension
            const { name, path, extension } = updateFieldValues({
              type: type,
              name: newItemData.name,
              path: selectedPath,
              extension: newItemData.type,
            });
            setNewItemData({ ...newItemData, path, name, type: extension });
          }}
        />
      )}
      {error && error.length > 0 && (
        <div className='py-2 text-red-800'>{error}</div>
      )}
      <div className='pb-3'>
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
            : newItemData.type === 'folder'
              ? dict.fileNavigator.updateFolder
              : dict.fileNavigator.updateFile}
        </Button>
      </div>
    </div>
  );
}
