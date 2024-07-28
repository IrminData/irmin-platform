'use client';

import React, { useState } from 'react';

import { itemCanBeCreated, updateFieldValues } from '@/lib/utils/bucketUtils';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/editor/pathSelector';
import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Bucket, BucketFolder } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Content for the "Add new folder" modal
 * Allows the user to create a new folder, selecting name and path for it
 *
 * @param options - The options for the item to create
 * @param options.bucket - The bucket the item is in
 * @param options.createFolder - Function to create a new folder
 *
 * @returns The modal content
 */
export default function AddNewFolderModal({
  bucket,
  createFolder,
}: {
  bucket: Bucket | null;
  createFolder: (folder: FileNavigatorItem) => void;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPathSelector, setShowPathSelector] = useState(true);
  const [newItemData, setNewItemData] = useState({
    name: '',
    path: '',
  });

  /**
   * Create the new folder based on the data
   *
   * @remarks
   *
   * Enable loading state when processing
   * Make sure the folder can be created
   * Create the new folder
   * Show an error if the creation fails
   * Close the modal after creation
   */
  const continueCreation = () => {
    if (loading) return;
    try {
      setLoading(true);
      // Make sure that can be created
      const canCreate = itemCanBeCreated(
        newItemData.path,
        newItemData.name,
        'folder',
        bucket,
        dict
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Create the new folder
      const newFolder = {
        bucket: bucket?.slug ?? '',
        name: newItemData.name,
        path: newItemData.path,
      } as BucketFolder;
      createFolder({
        original: null,
        current: newFolder,
        children: [],
        type: 'folder',
      });
      // Close the modal after creation
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
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFolderName}</label>
        <input
          id='name-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2 text-sm placeholder:text-gray-400'
          placeholder='my_folder_name'
          defaultValue={newItemData.name}
          onChange={(e) => {
            // Get the cursor position
            const cursorPosition = e.target.selectionStart;
            // Get and set the correct name and path
            const { name, path } = updateFieldValues({
              type: 'folder',
              name: e.target.value,
              path: newItemData.path,
              extension: '',
            });
            setNewItemData({ ...newItemData, path, name });
            // Restore the cursor position
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }}
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFolderPath}</label>
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
      </div>
      {showPathSelector && (
        <PathSelector
          bucket={bucket}
          itemName={newItemData.name}
          originalItemPath={null}
          currentSelected={newItemData.path}
          onSelectPath={(selectedPath: string) => {
            // Get and set the correct name and path
            const { name, path } = updateFieldValues({
              type: 'folder',
              name: newItemData.name,
              path: selectedPath,
              extension: '',
            });
            setNewItemData({ ...newItemData, path, name });
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
          onClick={continueCreation}
          disabled={loading}
        >
          {loading ? dict.misc.loading : dict.fileNavigator.createFolder}
        </Button>
      </div>
    </div>
  );
}
