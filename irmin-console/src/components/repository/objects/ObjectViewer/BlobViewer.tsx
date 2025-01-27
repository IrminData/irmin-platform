'use client';

import { useEffect, useState } from 'react';

import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';

import '@cyntler/react-doc-viewer/dist/index.css';

import { useLocale } from '@/context/LocaleContext';

const allowedMimeTypes = [
  'image/bmp',
  'text/csv',
  'application/vnd.oasis.opendocument.text',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/gif',
  'text/htm',
  'text/html',
  'image/jpg',
  'image/jpeg',
  'application/pdf',
  'image/png',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/tiff',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'image/webp',
];

/**
 * Component to display a preview of a Blob object
 *
 * @param props - The props
 * @param props.blob - The Blob object to preview
 */
const BlobViewer = ({ blob }: { blob: Blob }) => {
  const { dict } = useLocale();
  const [url, setUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');

  useEffect(() => {
    try {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setUrl(url);
        setMimeType(blob.type);

        // Cleanup the URL object
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    } catch (error) {
      console.error('Error reading blob content:', error);
    }
  }, [blob]);

  if (!url) return null;

  // Determine how to render the content based on the MIME type
  if (allowedMimeTypes.includes(mimeType)) {
    return (
      <DocViewer
        documents={[{ uri: url }]}
        pluginRenderers={DocViewerRenderers}
      />
    );
  } else {
    return (
      <div className='w-full pt-4 pb-12 text-center text-gray-600 dark:text-gray-400'>
        <p className='text-sm lg:text-lg'>
          {dict.repository.compare.unsupportedContentType}
        </p>
        <p className='text-xs'>{mimeType}</p>
      </div>
    );
  }
};

export default BlobViewer;
