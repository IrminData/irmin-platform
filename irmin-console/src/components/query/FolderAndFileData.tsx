'use client';

import FileCollectionSchema from '@/components/repository/collections/FileCollectionSchema';
import FolderCollectionSchema from '@/components/repository/collections/FolderCollectionSchema';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { FileCollectionData } from '@/types/core/FileCollection';
import { FolderCollectionData } from '@/types/core/FolderCollection';

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
      <div className='w-full px-4 py-4 text-center text-lg'>{title}</div>
      {loading ? <LoadingSkeleton className='h-96' /> : null}
      {!data ? (
        <div className='w-full px-4 py-12 text-center text-lg text-foreground/80'>
          {dict.query.noResults}
        </div>
      ) : (
        <div className='mx-auto flex w-full min-w-72 max-w-xl flex-col overflow-scroll rounded-md border border-gray-100 bg-background text-xs dark:border-gray-800'>
          <div className='bg-card px-4 py-2 text-sm font-semibold text-card-foreground'>
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
