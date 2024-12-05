'use client';

import { useLocale } from '@/context/LocaleContext';

import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import { JSONValue } from '@/types/internal/GenericJSON';

import JSONViewer from './ObjectViewer/JSONViewer';

/**
 * Component to display the schema of an object
 *
 * @param props - The props
 * @param props.object - The object being viewed
 * @param props.objectSchema - The schema of the object
 */
const SchemaViewer = ({
  object,
  objectSchema,
}: {
  object: Object;
  objectSchema: ObjectSchema;
}) => {
  const { dict } = useLocale();
  if (objectSchema.type === 'structured') {
    return (
      <JSONViewer
        name={`Schema - ${object.path}`}
        data={objectSchema.schema as unknown as JSONValue}
      />
    );
  } else {
    // Group objects and binaries (e.g. directories and binary files, like images, are not supported in the Schema Viewer)
    return (
      <div className='w-full pb-12 pt-4 text-center text-gray-600 dark:text-gray-400'>
        <p className='text-sm lg:text-lg'>
          {dict.repository.compare.unsupportedContentType}
        </p>
      </div>
    );
  }
};

export default SchemaViewer;
