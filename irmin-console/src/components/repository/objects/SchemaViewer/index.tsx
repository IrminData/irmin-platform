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
  isExpanded = false,
  focusedPath,
}: {
  /** The schema object plus metadata */
  schema: ObjectSchema;
  /** nesting depth */
  depth?: number;
  /** Whether to start expanded */
  isExpanded?: boolean;
  /** The path to focus on */
  focusedPath?: string;
}) {
  const { dict } = useLocale();

  // Check if this item or any of its children should be focused
  const shouldFocus = focusedPath ? schema.path === focusedPath : false;
  const shouldExpand = isExpanded || shouldFocus;

  switch (schema.type) {
    case 'structured':
      return (
        <StructuredItemViewer
          item={schema}
          isExpanded={shouldExpand}
          isFocused={shouldFocus}
        />
      );
    case 'binary':
      return <BinaryItemViewer item={schema} isFocused={shouldFocus} />;
    case 'group':
      return (
        <GroupItemViewer
          item={schema}
          depth={depth}
          isExpanded={shouldExpand}
          focusedPath={focusedPath}
          isFocused={shouldFocus}
        />
      );
    default:
      return (
        <div className='text-red-500'>
          {dict.repository.objects.unknownType}
        </div>
      );
  }
}

export default React.memo(ObjectSchemaViewer);
