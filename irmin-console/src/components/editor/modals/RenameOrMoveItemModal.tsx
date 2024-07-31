'use client';

import React, { useState } from 'react';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/editor/pathSelector';
import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  itemCanBeCreated,
} from '@/utils/bucket';

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
    contents: '',
    is_draft: false,
    extension:
      item.type === 'file' && item.current?.type ? item.current.type : 'sql',
    ...item.current,
  });
  const type = item.type;

  const extenstionSelectRef = React.useRef<HTMLSelectElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const pathInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Process the change in the inputs and update the state
   */
  const processChange = () => {
    // Get the current values
    const extensionInputValue = extenstionSelectRef.current?.value;
    const nameInputValue = nameInputRef.current?.value;
    const pathInputValue = pathInputRef.current?.value ?? newItemData.path;
    // Check that the values are not null
    if (!extensionInputValue || !nameInputValue) {
      pathInputRef.current!.value = '';
      return;
    }
    // Clean the name and add the extension
    const { withExtension, withoutExtension } = getCorrectNameWithExtension(
      nameInputValue,
      type,
      type === 'file'
        ? (extensionInputValue ?? newItemData.extension)
        : undefined
    );
    // Get the updated path
    const newPath = getCorrectPath(pathInputValue, withExtension);
    // Set the correct input values
    nameInputRef.current!.value = withoutExtension;
    pathInputRef.current!.value = newPath;
    // Update the state with the new info
    setNewItemData({
      ...newItemData,
      name: withExtension,
      path: newPath,
      extension: extensionInputValue ?? newItemData.extension ?? '',
    });
  };

  /**
   * Update the file/folder based on the values provided by the user
   */
  const continueUpdate = () => {
    if (loading) return;
    try {
      setError('');
      setLoading(true);
      // Make sure that can be created
      const canCreate = itemCanBeCreated(
        newItemData.path,
        newItemData.name,
        type,
        bucket,
        dict,
        newItemData.extension
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Update the item
      if (type === 'file') {
        const newFile = {
          is_draft: newItemData.is_draft,
          bucket: bucket?.slug ?? '',
          contents: newItemData.contents,
          name: newItemData.name,
          path: newItemData.path,
          type: newItemData.extension,
        } as BucketFile;
        updateFile({
          original: item.original,
          current: newFile,
          type: 'file',
        });
      } else if (type === 'folder') {
        const newFolder = {
          bucket: bucket?.slug ?? '',
          name: newItemData.name,
          path: newItemData.path,
        } as BucketFolder;
        updateFolder({
          original: item.original,
          children: item.children ?? [],
          current: newFolder,
          type: 'folder',
        });
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
              ref={extenstionSelectRef}
              id='type-select'
              disabled={loading}
              className='h-6 w-[146px] rounded border border-r-4 border-white bg-white px-2 py-1 text-xs'
              aria-label='Select the type of the file'
              defaultValue={newItemData.extension}
              onChange={() => processChange()}
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
          ref={nameInputRef}
          id='name-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2 text-sm placeholder:text-gray-400'
          placeholder='example'
          defaultValue={
            getCorrectNameWithExtension(
              newItemData.name,
              type,
              newItemData.extension
            ).withoutExtension
          }
          onChange={() => processChange()}
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
            ref={pathInputRef}
            id='path-input'
            disabled={true}
            type='text'
            className='w-full rounded border bg-gray-100 p-2 text-sm'
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
          onClick={continueUpdate}
          disabled={loading}
        >
          {loading
            ? dict.misc.loading
            : newItemData.extension === 'folder'
              ? dict.fileNavigator.updateFolder
              : dict.fileNavigator.updateFile}
        </Button>
      </div>
    </div>
  );
}
