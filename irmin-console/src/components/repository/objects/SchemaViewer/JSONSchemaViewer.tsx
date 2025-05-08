'use client';

import { useState } from 'react';

import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';

import type { JSONSchema } from '@/types/core/ObjectSchema';

/**
 * Component to visualise a JSON Schema
 */
export function JSONSchemaViewer({
  schema,
  isExpanded = false,
}: {
  /** Schema to visualise */
  schema: JSONSchema;
  /** Whether to start expanded */
  isExpanded?: boolean;
}) {
  // track expanded state
  const [expanded, setExpanded] = useState(isExpanded);

  /**
   * Toggle tree node expansion
   */
  const toggleExpand = () => setExpanded(!expanded);

  /**
   * Render nested object properties
   * @returns nested JSX or null
   */
  const renderProperties = () => {
    if (!schema.properties) return null;

    return (
      <div className='mt-2 ml-4 space-y-2'>
        {Object.entries(schema.properties).map(([key, prop]) => (
          <div
            key={key}
            className='border-l-2 border-gray-200 pl-3 dark:border-gray-700'
          >
            <div className='flex items-start'>
              <span className='font-medium text-gray-800 dark:text-gray-200'>
                {key}
              </span>
              {schema.required?.includes(key) && (
                <span className='ml-1 text-xs text-red-500'>*</span>
              )}
              <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
                ({prop.type})
              </span>
            </div>
            {prop.description && (
              <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                {prop.description}
              </p>
            )}

            {/* render nested object */}
            {prop.type === 'object' && prop.properties && (
              <JSONSchemaViewer schema={prop} isExpanded={false} />
            )}

            {/* render array items */}
            {prop.type === 'array' && prop.items && (
              <div className='mt-1 ml-4'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  Items:
                </span>
                <JSONSchemaViewer schema={prop.items} isExpanded={false} />
              </div>
            )}

            {/* render enum values */}
            {prop.enum && (
              <div className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                <span>Enum: </span>
                <code className='font-mono'>
                  [{prop.enum.map((v) => JSON.stringify(v)).join(', ')}]
                </code>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className='text-sm'>
      <div
        className='flex cursor-pointer items-center'
        onClick={toggleExpand}
        role='button'
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleExpand();
            e.preventDefault();
          }
        }}
      >
        {['object', 'array'].includes(schema.type) ? (
          <>
            {expanded ? (
              <MdKeyboardArrowDown className='h-4 w-4 text-gray-600 dark:text-gray-300' />
            ) : (
              <MdKeyboardArrowRight className='h-4 w-4 text-gray-600 dark:text-gray-300' />
            )}
            <span className='ml-1 font-medium text-gray-800 dark:text-gray-200'>
              {schema.type === 'object'
                ? `Object with ${Object.keys(schema.properties || {}).length} properties`
                : `Array of ${schema.items?.type}s`}
            </span>
          </>
        ) : (
          <span className='font-medium text-gray-800 dark:text-gray-200'>
            {schema.type}
          </span>
        )}
      </div>

      {expanded && (
        <>
          {/* if object, render its properties */}
          {schema.type === 'object' && renderProperties()}

          {/* if array, render its item schema */}
          {schema.type === 'array' && schema.items && (
            <div className='mt-2 ml-4'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>
                Items:
              </span>
              <JSONSchemaViewer schema={schema.items} isExpanded={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
