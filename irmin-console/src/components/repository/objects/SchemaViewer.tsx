'use client';

import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import { JSONValue } from '@/types/internal/GenericJSON';

import JSONViewer from './ObjectViewer/JSONViewer';

/**
 * Component to display the schema of an object
 *
 * @param props - The props
 * @param props.objectSchema - The schema of the object
 * @param props.object - (optional) The object being viewed
 */
const SchemaViewer = ({
  objectSchema,
  object,
}: {
  objectSchema: ObjectSchema;
  object?: Object;
}) => {
  return (
    <JSONViewer
      name={`${object?.path ? object.path + ' ' : ''}Schema`}
      data={objectSchema as unknown as JSONValue}
    />
  );
};

export default SchemaViewer;
