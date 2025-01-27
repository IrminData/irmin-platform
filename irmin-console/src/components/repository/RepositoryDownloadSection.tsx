'use client';

import { useEffect, useRef, useState } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import DownloadFailed from './download/DownloadFailed';
import DownloadSuccess from './download/DownloadSuccess';

/**
 * Section for download the repository or a specific path as a zip
 *
 * @param props - Component properties
 * @param props.selectedPath - The path in the repository to download as a zip
 */
const RepositoryDownloadSection = ({
  selectedPath,
}: {
  selectedPath?: string;
}) => {
  const { dict } = useLocale();
  const { downloadRepository, currentRef, currentRepository } = useRepository();
  const [downloadResult, setDownloadResult] = useState<
    'loading' | 'error' | 'completed'
  >('loading');
  const downloading = useRef(false);
  const downloaded = useRef(false);

  /**
   * Hook to fetch the content for the object being viewed and download it
   */
  useEffect(() => {
    if (downloading.current || downloaded.current) return;
    downloading.current = true;
    (async () => {
      try {
        await downloadRepository(selectedPath);
        // Set the download result to completed
        downloaded.current = true;
        setDownloadResult('completed');
      } catch (error) {
        console.error('Failed to download', error);
        setDownloadResult('error');
      } finally {
        downloading.current = false;
      }
    })();
  }, [downloadRepository, selectedPath]);

  if (downloadResult === 'completed') return <DownloadSuccess />;
  if (downloadResult === 'error') return <DownloadFailed />;

  return (
    <div className='relative container mx-auto flex max-w-7xl flex-col gap-4 py-4'>
      <h2 className='font-display text-opacity-80 w-full text-center text-3xl font-bold sm:text-4xl lg:text-5xl'>
        {`${dict.common.pleaseWait}`}
      </h2>
      <p className='w-full pb-4 text-center font-mono text-base sm:text-lg lg:text-xl'>
        {currentRepository?.name}
        {currentRef ? ` @ ${currentRef}` : ''}
      </p>
      <LoadingSkeleton className='h-96' />
    </div>
  );
};

export default RepositoryDownloadSection;
