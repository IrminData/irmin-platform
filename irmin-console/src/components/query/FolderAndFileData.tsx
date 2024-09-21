'use client';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import FileCollectionSchema from '@/components/repository/FileCollectionSchema';

import { useLocale } from '@/context/LocaleContext';

import { FileCollectionData } from '@/types/core/FileCollection';
import { FolderCollectionData } from '@/types/core/FolderCollection';

import FolderCollectionSchema from '../repository/FolderCollectionSchema';

/**
 * Show the content of a folder or file collection, e.g., {@link FileCollectionData} and {@link FolderCollectionData}.
 *
 * @param props - The props to pass to the component
 * @param props.title - Title of the folder or file
 * @param props.data - The data to display in the table
 * @param props.loading - Whether to show a loading skeleton
 */
const FolderAndFileData = ({
  title,
  data,
  loading,
}: {
  title: string;
  data: FileCollectionData | FolderCollectionData | null;
  loading?: boolean;
}) => {
  const { dict } = useLocale();

  return (
    <div className='flex h-0 flex-1 flex-col overflow-hidden'>
      <div className='w-full px-4 py-4 text-center text-lg text-gray-400'>
        {title}
      </div>
      {loading ? <LoadingSkeleton /> : null}
      {!data ? (
        <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
          {dict.query.noResults}
        </div>
      ) : (
        <div className='mx-auto flex w-full min-w-72 max-w-xl flex-col overflow-scroll rounded-md border border-gray-100 bg-white text-xs dark:border-gray-800 dark:bg-irmin_black'>
          <div className='bg-gray-100 px-4 py-2 text-sm font-semibold dark:bg-gray-800'>
            {data?.type === 'file'
              ? dict.repository.schema.file
              : dict.repository.schema.folder}{' '}
            {`"${data.name}"`}
          </div>
          <div className='p-2 text-lg'>
            {data?.type === 'file' && <FileCollectionSchema schema={data} />}
            {data?.type === 'folder' && (
              <FolderCollectionSchema schema={data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderAndFileData;
