'use client';

import React, { useState } from 'react';

import { itemCanBeCreated, updateFieldValues } from '@/lib/utils/bucketUtils';

import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import PathSelector from '@/components/editor/pathSelector';
import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Bucket, BucketFile, IrminFileType } from '@/types/api/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Content fot the Save As File modal in the editor
 * Allows the user to create a new file
 *
 * @param options - The options for the item to create
 * @param options.defaultName - The default name for the new file
 * @param options.defaultPath - The default path for the new file
 * @param options.defaultType - The default type for the new file
 * @param options.contents - The contents of the new file
 * @param options.bucket - The bucket the item is in
 * @param options.createFile - Function to create a new file
 *
 * @returns The modal content
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
  const [newItemData, setNewItemData] = useState({
    name: defaultName,
    path: defaultPath,
    extension: defaultType,
  });

  /**
   * Create the new item based on the data
   *
   * @remarks
   *
   * Enable loading state when processing
   * Make sure the item can be created
   * Create the new item
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
        'file',
        bucket,
        dict,
        newItemData.extension
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Create the new item
      const newItem = {
        bucket: bucket?.slug ?? '',
        name: newItemData.name,
        path: newItemData.path,
      };
      createFile({
        original: null,
        current: {
          type: 'file',
          contents: contents,
          is_draft: false,
          ...newItem,
        } as BucketFile,
        type: 'file',
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
      <div className='pb-2'>
        <div className='w-[150px] rounded border'>
          <select
            id='type-select'
            disabled={loading}
            className='h-6 w-[146px] rounded border border-r-4 border-white bg-white px-2 py-1 text-xs'
            aria-label='Select the type of the file'
            defaultValue={newItemData.extension}
            onChange={(e) => {
              // Get and set the correct name, path and extension
              const { name, path, extension } = updateFieldValues({
                type: 'file',
                name: newItemData.name,
                path: newItemData.path,
                extension: e.target.value,
              });
              setNewItemData({
                ...newItemData,
                path,
                name,
                extension,
              });
            }}
          >
            <option value='sql'>SQL</option>
            <option value='js'>JavaScript</option>
            <option value='py'>Python</option>
          </select>
        </div>
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFileName}</label>
        <input
          id='name-input'
          disabled={loading}
          type='text'
          className='w-full rounded border p-2 text-sm placeholder:text-gray-400'
          placeholder='example.sql'
          defaultValue={newItemData.name}
          onChange={(e) => {
            // Get the cursor position
            const cursorPosition = e.target.selectionStart;
            // Get and set the correct name, path and extension
            const { name, path, extension } = updateFieldValues({
              type: 'file',
              name: e.target.value,
              path: newItemData.path,
              extension: newItemData.extension,
            });
            setNewItemData({ ...newItemData, path, name, extension });
            // Restore the cursor position
            e.target.setSelectionRange(cursorPosition, cursorPosition);
          }}
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFilePath}</label>
        <div className='flex'>
          <input
            id='path-input'
            disabled={true}
            type='text'
            className='w-full rounded border bg-gray-100 p-2 text-sm placeholder:text-gray-300'
            placeholder='/folder/example.sql'
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
            // Get and set the correct name, path and extension
            const { name, path, extension } = updateFieldValues({
              type: 'file',
              name: newItemData.name,
              path: selectedPath,
              extension: newItemData.extension,
            });
            setNewItemData({ ...newItemData, path, name, extension });
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
          {loading ? dict.misc.loading : dict.fileNavigator.createFile}
        </Button>
      </div>
    </div>
  );
}
