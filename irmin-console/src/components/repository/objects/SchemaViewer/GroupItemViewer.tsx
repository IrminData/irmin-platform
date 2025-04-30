'use client';

import { useState } from 'react';

import { MdFolder } from 'react-icons/md';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

import ObjectSchemaViewer from './';

/**
 * Component to visualise a group schema object
 */
export function GroupItemViewer({
  item,
  depth = 0,
}: {
  /** The group item plus metadata */
  item: ObjectSchema;
  /** nesting depth */
  depth?: number;
}) {
  const { dict, locale } = useLocale();
  const [expanded, setExpanded] = useState(depth < 1);

  if (item.type !== 'group') return <></>;

  return (
    <div className='bg-popover/10 rounded-md border p-2 dark:border-gray-800'>
      <div className='flex items-start gap-3'>
        <MdFolder className='mt-1 h-6 w-6 flex-shrink-0 text-yellow-500 dark:text-yellow-300' />
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
              {dict.repository.objects.type}: {dict.repository.objects.group}
            </span>
            <span>
              {dict.repository.objects.children}: {item.children.length}
            </span>
          </div>
          <Button
            className='mt-2 -ml-2'
            variant='ghost'
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded
              ? dict.repository.objects.hideChildren
              : `${dict.repository.objects.showChildren} (${item.children.length})`}
          </Button>
          {expanded && (
            <div className='mt-3 space-y-3 pl-2'>
              {item.children.map((child, i) => (
                <ObjectSchemaViewer key={i} schema={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
