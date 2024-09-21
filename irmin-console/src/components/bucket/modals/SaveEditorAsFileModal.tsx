'use client';

import React, { useRef, useState } from 'react';

import ReactSelect, { SelectInstance } from 'react-select';

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

import {
  Bucket,
  BucketFile,
  IrminFileType,
  irminFileTypes,
  IrminFileTypeWithDetails,
} from '@/types/core/Bucket';
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
  const [newItemData, setNewItemData] = useState<{
    name: string;
    path: string;
    extension: IrminFileType;
  }>({
    name: defaultName,
    path: defaultPath,
    extension: defaultType,
  });

  const extenstionInputRef =
    useRef<SelectInstance<IrminFileTypeWithDetails>>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);

  /**
   * Process the change in the inputs and update the state
   */
  const processChange = (newExtensionValue?: IrminFileType) => {
    // Get the current values
    const nameInputValue = nameInputRef.current?.value ?? newItemData.name;
    const pathInputValue = pathInputRef.current?.value ?? newItemData.path;
    // Get the correct extension value
    let extensionInputValue: IrminFileType = newItemData.extension;
    if (!newExtensionValue) {
      // Use value based on the ref if not provided in props
      const extensionInputValues =
        extenstionInputRef.current?.getValue() ?? null;
      extensionInputValues?.forEach((value) => {
        extensionInputValue = value.extension as IrminFileType;
      });
    } else {
      // Use the extension value from props if provided
      extensionInputValue = newExtensionValue;
    }
    // Check that the values are not null
    if (!nameInputValue) {
      pathInputRef.current!.value = '';
      return;
    }
    // Clean the name and add the extension
    const withExtension = getCorrectNameWithExtension(
      nameInputValue,
      'file',
      extensionInputValue
    );
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
        <ReactSelect
          ref={extenstionInputRef}
          aria-label='Select the type of the file'
          isDisabled={loading}
          defaultValue={
            irminFileTypes.find((a) => a.extension === newItemData.extension) ??
            irminFileTypes[0]
          }
          onChange={(newValue) => {
            if (!newValue) return;
            processChange(newValue.extension);
          }}
          options={irminFileTypes}
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option.extension}
          className='react-select-container'
          classNamePrefix='react-select'
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFileName}</label>
        <input
          ref={nameInputRef}
          disabled={loading}
          type='text'
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
          placeholder='example'
          defaultValue={getNameWithoutExtension(
            getCorrectNameWithExtension(
              newItemData.name,
              'file',
              newItemData.extension
            )
          )}
          onChange={() => processChange()}
        />
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.fileNavigator.newFilePath}</label>
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
            colorScheme='secondary'
            size='sm'
            className='m-0 ml-auto p-0 pl-2 dark:text-gray-100'
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
