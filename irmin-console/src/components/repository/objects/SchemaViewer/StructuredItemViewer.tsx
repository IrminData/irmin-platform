'use client';

import { useState } from 'react';

import { MdDescription } from 'react-icons/md';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { formatFileSizeForUI } from '@/utils/formatFileSizeForUI';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

import { JSONSchemaViewer } from './JSONSchemaViewer';

/**
 * Component to visualise a structured schema object
 */
export function StructuredItemViewer({
  item,
  isExpanded = false,
  isFocused = false,
}: {
  item: ObjectSchema;
  isExpanded?: boolean;
  isFocused?: boolean;
}) {
  const { dict, locale } = useLocale();
  const [expanded, setExpanded] = useState(isExpanded);

  if (item.type !== 'structured') return <></>;

  return (
    <div
      className={`bg-popover/10 rounded-md border p-2 dark:border-gray-800 ${isFocused ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
    >
      <div className='flex items-start gap-3'>
        <MdDescription className='mt-1 h-6 w-6 flex-shrink-0 text-blue-500 dark:text-blue-300' />
        <div className='min-w-0 flex-grow'>
          <div className='flex flex-col justify-between gap-2 sm:flex-row sm:items-center'>
            <h3 className='truncate font-medium text-gray-900 dark:text-gray-100'>
              {item.name}
            </h3>
            {item.last_modified && (
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {dict.common.lastModified}:{' '}
                {new Date(item.last_modified).toLocaleDateString(locale)}
              </span>
            )}
          </div>
          <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
            {item.path}
          </p>
          {item.description && (
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
              {item.description}
            </p>
          )}
          <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400'>
            <span>
              {dict.repository.objects.type}:{' '}
              {dict.repository.objects.structured}
            </span>
            <span>
              {dict.common.size}: {formatFileSizeForUI(item.size)}
            </span>
            {item.content_type && <span>MIME: {item.content_type}</span>}
          </div>
          <Button
            className='mt-2 -ml-2'
            variant='ghost'
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded
              ? dict.repository.objects.hideSchema
              : dict.repository.objects.showSchema}
          </Button>
          {expanded && (
            <div className='mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700'>
              <JSONSchemaViewer schema={item.schema} isExpanded={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
