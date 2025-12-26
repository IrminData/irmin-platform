'use client';

import { useState } from 'react';

import { MdDescription } from 'react-icons/md';
import { TbCheck, TbCode, TbCopy, TbEye } from 'react-icons/tb';

import SqlHelper from '@/components/query/helper/SqlHelper';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'visual' | 'json'>('visual');

  if (item.type !== 'structured') return <></>;

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(item.schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`
        rounded-md border bg-popover/10 p-2
        dark:border-gray-800
        ${
          isFocused
            ? `
              ring-2 ring-blue-500
              dark:ring-blue-400
            `
            : ''
        }
      `}
    >
      <div className='flex items-start gap-3'>
        <MdDescription
          className={`
            mt-1 size-6 shrink-0 text-blue-500
            dark:text-blue-300
          `}
        />
        <div className='min-w-0 grow'>
          <div
            className={`
              flex flex-col justify-between gap-2
              sm:flex-row sm:items-center
            `}
          >
            <h3
              className={`
                truncate font-medium text-gray-900
                dark:text-gray-100
              `}
            >
              {item.name}
            </h3>
            {item.last_modified && (
              <span
                className={`
                  text-xs text-gray-500
                  dark:text-gray-400
                `}
              >
                {dict.common.lastModified}:{' '}
                {new Date(item.last_modified).toLocaleDateString(locale)}
              </span>
            )}
          </div>
          <p
            className={`
              truncate text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            {item.path}
          </p>
          {item.description && (
            <p
              className={`
                mt-1 text-sm text-gray-600
                dark:text-gray-300
              `}
            >
              {item.description}
            </p>
          )}
          <div
            className={`
              mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500
              dark:text-gray-400
            `}
          >
            <span>
              {dict.repository.objects.type}:{' '}
              {dict.repository.objects.structured}
            </span>
            <span>
              {dict.common.size}: {formatFileSizeForUI(item.size)}
            </span>
            {item.content_type && <span>MIME: {item.content_type}</span>}
          </div>
          {item.sql_selector && (
            <div className='mt-2 w-full max-w-full'>
              <div
                className={`
                  flex items-center gap-1 rounded bg-gray-100 p-1
                  dark:bg-gray-800
                `}
              >
                <code
                  className={`
                    flex-1 overflow-x-auto px-1 font-mono text-[10px]
                    whitespace-nowrap
                  `}
                >
                  {item.sql_selector}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  className='size-6 p-0'
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      item.sql_selector || ''
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title={copied ? dict.common.copied : dict.common.copy}
                  icon={
                    copied ? (
                      <TbCheck size={12} className='text-green-500' />
                    ) : (
                      <TbCopy size={12} />
                    )
                  }
                />
              </div>
            </div>
          )}
          <div className='mt-2 flex items-center gap-2'>
            <Button
              className='-ml-2'
              variant='ghost'
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {expanded
                ? dict.repository.objects.hideSchema
                : dict.repository.objects.showSchema}
            </Button>
            <SqlHelper
              schema={item}
              title={item.name}
              currentSql={
                item.sql_selector
                  ? `SELECT * FROM ${item.sql_selector} LIMIT 10`
                  : undefined
              }
              selector={item.sql_selector}
            />
          </div>
          {expanded && (
            <div
              className={`
                mt-2 rounded-md border border-gray-200 bg-gray-50 p-3
                dark:border-gray-600 dark:bg-gray-700
              `}
            >
              <div className='mb-3 flex items-center justify-between'>
                <span className='text-sm font-medium text-muted-foreground'>
                  {dict.repository.schema.schema}
                </span>
                <div className='flex items-center gap-2'>
                  <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as 'visual' | 'json')}
                  >
                    <TabsList className='h-7 bg-muted/50 p-0.5'>
                      <TabsTrigger value='visual' className='h-6 px-3 text-sm'>
                        <TbEye className='mr-1 size-3' />
                        {dict.common.visual}
                      </TabsTrigger>
                      <TabsTrigger value='json' className='h-6 px-3 text-sm'>
                        <TbCode className='mr-1 size-3' />
                        {dict.schemaBuilder.rawJson}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {mode === 'json' && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 px-3'
                      onClick={handleCopyJson}
                      title={copied ? dict.common.copied : dict.common.copy}
                    >
                      {copied ? (
                        <>
                          <TbCheck className='mr-1 size-3 text-green-500' />
                          {dict.common.copied}
                        </>
                      ) : (
                        <>
                          <TbCopy className='mr-1 size-3' />
                          {dict.common.copy}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {mode === 'visual' ? (
                <JSONSchemaViewer schema={item.schema} isExpanded={false} />
              ) : (
                <pre
                  className={`
                    overflow-x-auto rounded-md border bg-background p-3
                    font-mono text-xs
                  `}
                >
                  {JSON.stringify(item.schema, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
