'use client';

import { useId, useState } from 'react';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import type { JSONSchema } from '@/types/core/ObjectSchema';

/**
 * Component to visualise a JSON Schema
 */
export function JSONSchemaViewer({
  schema,
  isExpanded = false,
}: {
  /** Schema to visualise */
  schema: JSONSchema | undefined;
  /** Whether to start expanded */
  isExpanded?: boolean;
}) {
  const { dict, locale } = useLocale();
  // track expanded state
  const [expanded, setExpanded] = useState(isExpanded);
  const contentId = useId();
  const isExpandable = ['object', 'array'].includes(schema?.type ?? '');

  /**
   * Toggle tree node expansion
   */
  const toggleExpand = () => setExpanded((current) => !current);

  /**
   * Render nested object properties
   * @returns nested JSX or null
   */
  const renderProperties = () => {
    if (!schema?.properties) return null;

    return (
      <div className='mt-2 ml-4 space-y-2'>
        {Object.entries(schema.properties).map(([key, prop]) => (
          <div key={key} className={`border-l-2 border-border pl-3`}>
            <div className='flex items-start'>
              <span className={`font-medium text-foreground`}>{key}</span>
              {schema.required?.includes(key) && (
                <>
                  <span
                    className='ml-1 text-xs text-destructive'
                    aria-hidden='true'
                  >
                    *
                  </span>
                  <span className='sr-only'>{dict.schemaBuilder.required}</span>
                </>
              )}
              <span className={`ml-2 text-sm text-muted-foreground`}>
                ({prop.type})
              </span>
            </div>
            {prop.description && (
              <p className={`mt-1 text-sm text-muted-foreground`}>
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
                <span className={`text-sm text-muted-foreground`}>
                  {dict.repository.objects.schemaItems}:
                </span>
                <JSONSchemaViewer schema={prop.items} isExpanded={false} />
              </div>
            )}

            {/* render enum values */}
            {prop.enum && (
              <div className={`mt-1 text-sm text-muted-foreground`}>
                <span>{dict.schemaBuilder.enum}: </span>
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
      {isExpandable ? (
        <button
          type='button'
          className={`
            flex w-full appearance-none items-center rounded-[2px] border-0
            bg-transparent p-0 text-left
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-accent
          `}
          onClick={toggleExpand}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          {expanded ? (
            <TbChevronDown
              className='size-4 text-muted-foreground'
              aria-hidden='true'
            />
          ) : (
            <TbChevronRight
              className='size-4 text-muted-foreground'
              aria-hidden='true'
            />
          )}
          <span className='ml-1 font-medium text-foreground'>
            {schema?.type === 'object'
              ? (Object.keys(schema?.properties || {}).length === 1
                  ? dict.repository.objects.schemaObjectSummaryOne
                  : dict.repository.objects.schemaObjectSummaryOther
                ).replace(
                  '{count}',
                  new Intl.NumberFormat(locale).format(
                    Object.keys(schema?.properties || {}).length
                  )
                )
              : dict.repository.objects.schemaArraySummary.replace(
                  '{type}',
                  String(
                    schema?.items?.type ?? dict.repository.objects.unknownType
                  )
                )}
          </span>
        </button>
      ) : (
        <span className='font-medium text-foreground'>{schema?.type}</span>
      )}

      {isExpandable && (
        <div id={contentId} hidden={!expanded}>
          {/* if object, render its properties */}
          {expanded && schema?.type === 'object' && renderProperties()}

          {/* if array, render its item schema */}
          {expanded && schema?.type === 'array' && schema?.items && (
            <div className='mt-2 ml-4'>
              <span className={`text-sm text-muted-foreground`}>
                {dict.repository.objects.schemaItems}:
              </span>
              <JSONSchemaViewer schema={schema?.items} isExpanded={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
