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
  BucketFolder,
  IrminFileType,
  irminFileTypes,
  IrminFileTypeWithDetails,
} from '@/types/core/Bucket';
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
      type,
      type === 'file'
        ? (extensionInputValue ?? newItemData.extension)
        : undefined
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
          <ReactSelect
            ref={extenstionInputRef}
            aria-label='Select the type of the file'
            isDisabled={loading}
            defaultValue={
              irminFileTypes.find(
                (a) => a.extension === newItemData.extension
              ) ?? irminFileTypes[0]
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
          disabled={loading}
          type='text'
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
          placeholder='example'
          defaultValue={getNameWithoutExtension(
            getCorrectNameWithExtension(
              newItemData.name,
              type,
              newItemData.extension
            )
          )}
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
