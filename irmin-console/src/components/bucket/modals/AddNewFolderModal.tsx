'use client';

import React, { useState } from 'react';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/bucket/navigator/PathSelector';
import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  getNameWithoutExtension,
  itemCanBeCreated,
} from '@/utils/bucket';

import { Bucket, BucketFolder } from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Content for the "Add new folder" modal
 * Allows the user to create a new folder, selecting name and path for it
 *
 * @param options - The options for the item to create
 * @param options.bucket - The bucket the item is in
 * @param options.createFolder - Function to create a new folder
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

  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const pathInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Process the change in the inputs and update the state
   */
  const processChange = () => {
    // Get the current values
    const nameInputValue = nameInputRef.current?.value ?? newItemData.name;
    const pathInputValue = pathInputRef.current?.value ?? newItemData.path;
    // Check that the values are not null
    if (!nameInputValue) {
      pathInputRef.current!.value = '';
      return;
    }
    // Clean the name and add the extension
    const withExtension = getCorrectNameWithExtension(nameInputValue, 'folder');
    // Get the updated path
    const newPath = getCorrectPath(pathInputValue, withExtension);
    // Set the correct input values
    nameInputRef.current!.value = getNameWithoutExtension(withExtension);
    pathInputRef.current!.value = newPath;
    // Update the state with the new info
    setNewItemData({
      ...newItemData,
      name: withExtension,
      path: newPath,
    });
  };

  /**
   * Create the folder based on the values provided by the user
   */
  const continueCreation = () => {
    if (loading) return;
    try {
      setError('');
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
          ref={nameInputRef}
          disabled={loading}
          type='text'
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
          placeholder='my_folder_name'
          defaultValue={getNameWithoutExtension(
            getCorrectNameWithExtension(newItemData.name, 'folder')
          )}
          onChange={() => processChange()}
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFolderPath}</label>
        <div className='flex'>
          <input
            ref={pathInputRef}
            disabled={true}
            type='text'
            className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
            value={newItemData.path}
          />
          <Button
            variant='icon'
            colorScheme='light'
            size='sm'
            className='m-0 ml-2 rounded-lg p-0 pl-2'
            ariaLabel='Toggle the path selector'
            onClick={() => setShowPathSelector(!showPathSelector)}
            disabled={loading}
            icon={
              showPathSelector ? (
                <IoChevronUp className='inline-block' size={24} />
              ) : (
                <IoChevronDown className='inline-block' size={24} />
              )
            }
          />
        </div>
      </div>
      {showPathSelector && (
        <PathSelector
          bucket={bucket}
          itemName={newItemData.name}
          originalItemPath={null}
          currentSelected={newItemData.path}
          onSelectPath={(selectedPath: string) => {
            setNewItemData({ ...newItemData, path: selectedPath });
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
