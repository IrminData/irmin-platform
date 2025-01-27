'use client';

import { useEffect, useRef, useState } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import { downloadFile } from '@/utils/downloadFile';

import { Object } from '@/types/core/Object';
import { ContentType } from '@/types/examples/core/content';

import DownloadFailed from './download/DownloadFailed';
import DownloadSuccess from './download/DownloadSuccess';

/**
 * Section for download the content of a specific object in a repository
 *
 * @param props - Component properties
 * @param props.selectedObject - The repository object being displayed
 */
const RepositoryObjectDownloadSection = ({
  selectedObject,
}: {
  selectedObject: Object;
}) => {
  const { dict } = useLocale();
  const { getObjectContent, currentRef } = useRepository();
  const [downloadResult, setDownloadResult] = useState<
    'loading' | 'error' | 'completed'
  >('loading');
  const loadingObjectContent = useRef(false);
  const downloaded = useRef(false);

  /**
   * Hook to fetch the content for the object being viewed and download it
   */
  useEffect(() => {
    if (loadingObjectContent.current || downloaded.current) return;
    loadingObjectContent.current = true;
    (async () => {
      try {
        const type =
          selectedObject.type === 'binary'
            ? ContentType.image
            : ContentType.json;
        const fetchedContent = await getObjectContent(
          selectedObject.path,
          true,
          type
        );
        // Download the content as a file
        if (fetchedContent instanceof Blob) {
          downloadFile(
            fetchedContent,
            selectedObject.name,
            selectedObject.content_type ?? 'text/plain'
          );
        } else {
          downloadFile(
            JSON.stringify(fetchedContent, null, 2),
            selectedObject.name,
            selectedObject.content_type ?? 'text/plain'
          );
        }
        // Set the download result to completed
        downloaded.current = true;
        setDownloadResult('completed');
      } catch (error) {
        // Log the error and set the download result to error
        console.error('Failed to fetch object content', error);
        setDownloadResult('error');
      } finally {
        loadingObjectContent.current = false;
      }
    })();
  }, [getObjectContent, selectedObject]);

  if (downloadResult === 'completed') return <DownloadSuccess />;
  if (downloadResult === 'error') return <DownloadFailed />;

  return (
    <div className='relative container mx-auto flex max-w-7xl flex-col gap-4 py-4'>
      <h2 className='font-display text-opacity-80 w-full text-center text-3xl font-bold sm:text-4xl lg:text-5xl'>
        {`${dict.common.pleaseWait}...`}
      </h2>
      <p className='w-full pb-4 text-center font-mono text-base sm:text-lg lg:text-xl'>
        {`${selectedObject.path}`}
        {currentRef ? ` @ ${currentRef}` : ''}
      </p>
      <LoadingSkeleton className='h-96' />
    </div>
  );
};

export default RepositoryObjectDownloadSection;
