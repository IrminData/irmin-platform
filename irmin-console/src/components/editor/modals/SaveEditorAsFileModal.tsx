'use client';

import React, { useState } from 'react';

import {
  getCorrectNameWithExtension,
  getCorrectPath,
  itemCanBeCreated,
} from '@/lib/utils/bucketUtils';

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

  const extenstionSelectRef = React.useRef<HTMLSelectElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const pathInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Process the change in the inputs and update the state
   */
  const processChange = () => {
    // Get the current values
    const extensionInputValue =
      extenstionSelectRef.current?.value ?? newItemData.extension;
    const nameInputValue = nameInputRef.current?.value ?? newItemData.name;
    const pathInputValue = pathInputRef.current?.value ?? newItemData.path;
    // Check that the values are not null
    if (!extensionInputValue || !nameInputValue) {
      pathInputRef.current!.value = '';
      return;
    }
    // Clean the name and add the extension
    const { withExtension, withoutExtension } = getCorrectNameWithExtension(
      nameInputValue,
      'file',
      extensionInputValue
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
   * Create the new item based on the values provided by the user
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
        'file',
        bucket,
        dict,
        newItemData.extension
      );
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason);
      }
      // Create the new file
      const newFile = {
        is_draft: false,
        bucket: bucket?.slug ?? '',
        contents: contents,
        name: newItemData.name,
        path: newItemData.path,
        type: newItemData.extension,
      } as BucketFile;
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
    }
  };

  return (
    <div>
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
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFileName}</label>
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
              'file',
              newItemData.extension
            ).withoutExtension
          }
          onChange={() => processChange()}
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFilePath}</label>
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
          {loading ? dict.misc.loading : dict.fileNavigator.createFile}
        </Button>
      </div>
    </div>
  );
}
