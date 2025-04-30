'use client';

import React from 'react';

import { useLocale } from '@/context/LocaleContext';

import { ObjectSchema } from '@/types/core/ObjectSchema';

import { BinaryItemViewer } from './BinaryItemViewer';
import { GroupItemViewer } from './GroupItemViewer';
import { StructuredItemViewer } from './StructuredItemViewer';

/**
 * Main component to visualise a single ObjectSchema
 * @param props - schema plus optional depth
 * @returns JSX element
 */
function ObjectSchemaViewer({
  schema,
  depth = 0,
}: {
  /** The schema object plus metadata */
  schema: ObjectSchema;
  /** nesting depth */
  depth?: number;
}) {
  const { dict } = useLocale();
  switch (schema.type) {
    case 'structured':
      return <StructuredItemViewer item={schema} />;
    case 'binary':
      return <BinaryItemViewer item={schema} />;
    case 'group':
      return <GroupItemViewer item={schema} depth={depth} />;
    default:
      return (
        <div className='text-red-500'>
          {dict.repository.objects.unknownType}
        </div>
      );
  }
}

export default React.memo(ObjectSchemaViewer);
