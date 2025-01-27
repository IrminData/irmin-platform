'use client';

import { useLocale } from '@/context/LocaleContext';

import { checkIfSimpleArrayOfObjects } from '@/utils/checkIfSimpleArrayOfObjects';

import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';
import { JSONValue } from '@/types/internal/GenericJSON';

import BlobViewer from './BlobViewer';
import JSONViewer from './JSONViewer';
import TableViewer from './TableViewer';

/**
 * Component to display the content of an object
 *
 * @param props - The props
 * @param props.object - The object being viewed
 * @param props.objectContent - The content of the object to show
 */
const ObjectViewer = ({
  object,
  objectContent,
}: {
  object: Object;
  objectContent: IrminAPIBinaryResponse;
}) => {
  const { dict } = useLocale();
  if (object.type === 'structured') {
    const isSimpleArrayOfObjects = checkIfSimpleArrayOfObjects(
      objectContent as JSONValue
    );
    if (isSimpleArrayOfObjects) {
      return (
        <div className='flex h-[calc(100vh-400px)] min-h-96 flex-col'>
          <TableViewer
            title={''}
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
  } else if (object.type === 'binary') {
    return <BlobViewer blob={objectContent as Blob} />;
  } else {
    // Group objects (e.g. directories are not supported in the Object Viewer)
    return (
      <div className='w-full pt-4 pb-12 text-center text-gray-600 dark:text-gray-400'>
        <p className='text-sm lg:text-lg'>
          {dict.repository.compare.unsupportedContentType}
        </p>
      </div>
    );
  }
};

export default ObjectViewer;
