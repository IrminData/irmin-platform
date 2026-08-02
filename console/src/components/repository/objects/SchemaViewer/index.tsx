'use client';

import { memo } from 'react';

import { useLocale } from '@/context/LocaleContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

import { BinaryItemViewer } from './BinaryItemViewer';
// eslint-disable-next-line import-x/no-cycle
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
  loadChildren,
}: {
  /** The schema object plus metadata */
  schema: ObjectSchema;
  /** nesting depth */
  depth?: number;
  /** Whether to start expanded */
  isExpanded?: boolean;
  /** The path to focus on */
  focusedPath?: string;
  /**
   * Optional fetcher invoked when a group node with no `children` is
   * expanded. Lets connection-side callers lazily resolve deeper levels
   * via the path-aware schema endpoint. Repository / query / script
   * callers pass nothing and the lazy code path stays inert.
   */
  loadChildren?: (path: string) => Promise<ObjectSchema>;
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
          loadChildren={loadChildren}
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

export default memo(ObjectSchemaViewer);
