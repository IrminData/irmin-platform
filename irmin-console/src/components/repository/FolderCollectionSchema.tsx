'use client';

import React, { useState } from 'react';

import { TbChevronLeft, TbDownload, TbFile, TbFolder } from 'react-icons/tb';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import {
  FolderItemFile,
  FolderItemFolder,
  FolderSchema,
} from '@/types/internal/FolderCollection';

import FileCollectionSchema from './FileCollectionSchema';

/**
 * Component for displaying the schema for a folder collection like a file browser, using flex column layout.
 *
 * @param props - The component props
 * @param props.schema - The folder schema to display
 */
export default function FolderCollectionSchema({
  schema,
}: {
  schema: FolderSchema;
}) {
  const { dict } = useLocale();
  const [currentFolder, setCurrentFolder] = useState<FolderSchema>(schema);
  const [folderHistory, setFolderHistory] = useState<FolderSchema[]>([]);
  const [selectedFile, setSelectedFile] = useState<FolderItemFile | null>(null);

  // Navigate into a folder
  const handleFolderClick = (folder: FolderItemFolder) => {
    setFolderHistory([...folderHistory, currentFolder]);
    setCurrentFolder(folder.children);
    setSelectedFile(null);
  };

  // Navigate back to previous folder
  const handleBackClick = () => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      const previousFolder = newHistory.pop()!;
      setFolderHistory(newHistory);
      setCurrentFolder(previousFolder);
    }
    setSelectedFile(null);
  };

  // Handle file click to display the file schema
  const handleFileClick = (file: FolderItemFile) => {
    setSelectedFile(file);
  };

  // Handle download folder
  const handleDownload = () => {
    // TODO: Download the folder from the server
  };

  return (
    <div className='flex flex-col gap-2'>
      {(folderHistory.length > 0 || selectedFile) && (
        <Button
          onClick={handleBackClick}
          className='px-0 lg:px-0'
          colorScheme='gray'
          variant='link'
          size='sm'
          icon={<TbChevronLeft />}
        >
          {dict.misc.back}
        </Button>
      )}

      {selectedFile ? (
        <FileCollectionSchema schema={selectedFile.file} />
      ) : (
        <div className='flex flex-col'>
          {currentFolder.items.map((item, index) => (
            <div
              key={index}
              className='flex cursor-pointer items-center justify-between gap-2 rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700'
              onClick={
                item.type === 'folder'
                  ? () => handleFolderClick(item)
                  : () => handleFileClick(item as FolderItemFile)
              }
            >
              <div className='flex items-center'>
                {item.type === 'folder' ? (
                  <>
                    <TbFolder className='mr-2 text-blue-500' />
                    <span>{item.name}</span>
                  </>
                ) : (
                  <>
                    <TbFile className='mr-2 text-gray-500' />
                    <span>
                      {item.file.name}{' '}
                      {`(${(item.file.size / (1024 * 1024)).toFixed(3)} MB)`}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!selectedFile && (
        <Button
          onClick={handleDownload}
          className='w-full'
          colorScheme='black'
          variant='link'
          size='sm'
          icon={<TbDownload />}
        >
          {dict.repository.download}
        </Button>
      )}
    </div>
  );
}
