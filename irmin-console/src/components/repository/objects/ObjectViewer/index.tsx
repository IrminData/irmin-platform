'use client';

import { useLocale } from '@/context/LocaleContext';

import { checkIfSimpleArrayOfObjects } from '@/utils/checkIfSimpleArrayOfObjects';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import type { RepositoryObject } from '@/types/core/RepositoryObject';
import type { JSONValue } from '@/types/internal/GenericJSON';

import BlobViewer from './BlobViewer';
import EmbeddingViewer from './EmbeddingViewer';
import JSONViewer from './JSONViewer';
import TableViewer from './TableViewer';

/**
 * Checks if a repository object is an embedding file.
 * Embedding files are .parquet files with the 'irmin-file-type' metadata set to 'embeddings'.
 */
const isEmbeddingFile = (obj: RepositoryObject): boolean =>
  obj.path.endsWith('.parquet') &&
  obj.metadata?.['irmin-file-type'] === 'embeddings';

/**
 * Component to display the content of an object
 *
 * @param props - The props
 * @param props.object - The object being viewed
 * @param props.objectContent - The content of the object to show or null if not available
 */
const ObjectViewer = ({
  object,
  objectContent,
}: {
  object: RepositoryObject;
  objectContent: IrminAPIBinaryResponse | null;
}) => {
  const { dict } = useLocale();

  // Handle embedding files with special viewer
  if (isEmbeddingFile(object)) {
    return <EmbeddingViewer object={object} />;
  }

  if (!objectContent) {
    // If the content is not available, show a message
    return (
      <div
        className={`
          w-full pt-4 pb-12 text-center text-gray-600
          dark:text-gray-400
        `}
      >
        <p
          className={`
            text-sm
            lg:text-lg
          `}
        >
          {dict.repository.objects.contentUnavailable}
        </p>
      </div>
    );
  }
  if (objectContent instanceof Blob) {
    return <BlobViewer blob={objectContent} object={object} />;
  } else if (
    Array.isArray(objectContent) ||
    typeof objectContent === 'object'
  ) {
    const isSimpleArrayOfObjects = checkIfSimpleArrayOfObjects(
      objectContent as JSONValue
    );
    if (isSimpleArrayOfObjects) {
      return (
        <div className='flex h-[calc(100vh-400px)] min-h-96 flex-col'>
          <TableViewer
            title={object.path}
            metadata={{}}
            data={objectContent as JSONValue}
          />
        </div>
      );
    } else {
      return (
        <JSONViewer name={object.path} data={objectContent as JSONValue} />
      );
    }
  } else {
    // Group objects (e.g. directories are not supported in the Object Viewer)
    return (
      <div
        className={`
          w-full pt-4 pb-12 text-center text-gray-600
          dark:text-gray-400
        `}
      >
        <p
          className={`
            text-sm
            lg:text-lg
          `}
        >
          {dict.repository.objects.unsupportedContentType}
        </p>
      </div>
    );
  }
};

export default ObjectViewer;
