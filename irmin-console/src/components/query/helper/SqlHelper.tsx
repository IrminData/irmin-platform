'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbCheck,
  TbChevronDown,
  TbCopy,
  TbExternalLink,
  TbInfoCircle,
  TbSparkles,
} from 'react-icons/tb';

import { JSONSchemaViewer } from '@/components/repository/objects/SchemaViewer/JSONSchemaViewer';
import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import { useRepositoryObjectSchema } from '@/hooks/api/useRepositoryObjectSchema';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { RepositoryObject } from '@/types/core/RepositoryObject';

import { SqlGenerationChat } from './SqlGenerationChat';

/**
 * SQL Helper component to assist users with writing Irmin SQL queries.
 * Provides syntax examples, placeholder explanations, and schema-specific selectors.
 */
export default function SqlHelper({
  schema,
  selector,
  title,
  repositoryObject,
  currentSql,
}: {
  schema?: ObjectSchema;
  selector?: string;
  title?: string;
  repositoryObject?: RepositoryObject;
  currentSql?: string;
}) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);

  // Conversation state - persists across Sheet open/close
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatConversationId, setChatConversationId] = useState<
    string | undefined
  >(undefined);

  const handleChatReset = useCallback(() => {
    setChatMessages([]);
    setChatConversationId(undefined);
  }, []);

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    repositoryObject?.repository_slug ?? '',
    repositoryObject?.ref,
    repositoryObject?.path,
    { enabled: !!repositoryObject }
  );

  const effectiveSchema =
    schema ||
    (repositoryObject ? repositoryObjectSchemaQuery.data?.data : undefined);

  // Prefer object's selector, then schema's, then passed selector
  const displaySelector =
    repositoryObject?.sql_selector_example ||
    effectiveSchema?.sql_selector_example ||
    selector;
  const displayName =
    repositoryObject?.name ||
    effectiveSchema?.name ||
    title ||
    dict.repository.objects.object;

  // Determine if object is JSON for showing JSON-specific examples
  const isJsonObject =
    (repositoryObject?.type === 'structured' ||
      effectiveSchema?.type === 'structured') &&
    (repositoryObject?.content_type?.includes('json') ||
      effectiveSchema?.content_type?.includes('json') ||
      repositoryObject?.path?.toLowerCase().endsWith('.json') ||
      effectiveSchema?.path?.toLowerCase().endsWith('.json') ||
      repositoryObject?.path?.toLowerCase().endsWith('.jsonl') ||
      effectiveSchema?.path?.toLowerCase().endsWith('.jsonl'));

  const context = useMemo(() => {
    if (!displaySelector) return null;
    const match = displaySelector.match(/\$\["(.*?)"\]/);
    if (!match) return null;
    const content = match[1];
    const parts = content.split(';');
    if (parts.length < 3) return null;

    const repository = parts[1];
    const remainder = parts.slice(2).join(';');

    const refIndex = remainder.lastIndexOf('@');
    let path = remainder;
    let ref = '';
    if (refIndex !== -1) {
      path = remainder.substring(0, refIndex);
      ref = remainder.substring(refIndex + 1);
    }

    return { repository, path, ref };
  }, [displaySelector]);

  const getSelectorWithRef = (baseSelector: string, ref: string) => {
    if (/@([^"]+)"]$/.test(baseSelector)) {
      return baseSelector.replace(/@([^"]+)"]$/, `@${ref}"]`);
    }
    return baseSelector.replace('"]', `@${ref}"]`);
  };

  // Build context for the query agent
  const agentContext = useMemo(() => {
    const ctx: Record<string, unknown> = {};
    if (repositoryObject?.repository_slug) {
      ctx['repository-slug'] = repositoryObject.repository_slug;
    }
    if (repositoryObject?.path) {
      ctx['repository-object-path'] = repositoryObject.path;
    }
    if (repositoryObject?.ref) {
      ctx['repository-ref'] = repositoryObject.ref;
    }
    if (displaySelector) {
      ctx['sql-selector'] = displaySelector;
    }
    if (effectiveSchema?.schema) {
      ctx['schema'] = effectiveSchema.schema;
    }
    if (currentSql) {
      ctx['current-sql'] = currentSql;
    }
    return ctx;
  }, [repositoryObject, displaySelector, effectiveSchema, currentSql]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <ButtonWithTooltip
          variant='secondary'
          size='sm'
          icon={<TbSparkles size={18} />}
          className='size-8 p-0'
          tooltip={dict.queryHelper.title}
        />
      </SheetTrigger>
      <SheetContent
        className={`
          flex w-[400px] flex-col overflow-hidden
          focus:outline-none
          focus-visible:outline-none
          sm:w-[540px]
        `}
      >
        <SheetHeader>
          <SheetTitle>{dict.queryHelper.title}</SheetTitle>
        </SheetHeader>

        <Tabs
          defaultValue='generate'
          className={`
            flex flex-1 flex-col overflow-hidden
            focus:outline-none
            focus-visible:outline-none
          `}
        >
          <TabsList
            className={`
              grid w-full grid-cols-2 gap-1 bg-transparent px-2
              focus:outline-none
              focus-visible:outline-none
            `}
          >
            <TabsTrigger
              value='generate'
              className={`
                focus:outline-none
                focus-visible:outline-none
              `}
            >
              {dict.queryHelper.generateSql}
            </TabsTrigger>
            <TabsTrigger
              value='examples'
              className={`
                focus:outline-none
                focus-visible:outline-none
              `}
            >
              {dict.queryHelper.queryDocumentationTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='generate'
            className='mt-4 flex flex-1 flex-col overflow-hidden'
          >
            <div className='flex-1 overflow-hidden'>
              <SqlGenerationChat
                context={agentContext}
                messages={chatMessages}
                setMessages={setChatMessages}
                conversationId={chatConversationId}
                setConversationId={setChatConversationId}
                onReset={handleChatReset}
              />
            </div>
          </TabsContent>

          <TabsContent value='examples' className='mt-4 flex-1 overflow-y-auto'>
            {/* DuckDB Information Section */}
            <section className='mb-4 px-2'>
              <div className='rounded-md border bg-card p-2'>
                <div className='mb-2 flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>
                    {dict.queryHelper.poweredBy}
                  </h3>
                  <a
                    href='https://duckdb.org/docs/sql/introduction'
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`
                      flex items-center gap-1 text-xs text-accent
                      hover:underline
                    `}
                  >
                    {dict.queryHelper.duckDbDocs}
                    <TbExternalLink size={12} />
                  </a>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {dict.queryHelper.duckDbDescription}
                </p>
              </div>
            </section>

            {/* Placeholder Syntax Section */}
            <section className='mb-4 px-2'>
              <div className='rounded-md border bg-card p-2'>
                <h3 className='mb-2 text-sm font-semibold'>
                  {dict.queryHelper.placeholderSyntax} (
                  {dict.queryHelper.recommended})
                </h3>
                <p className='mb-3 text-xs text-muted-foreground'>
                  {dict.queryHelper.placeholderDescription}
                </p>
                <div className='rounded-md bg-muted p-2 font-mono text-xs'>
                  {`$["workspace;repository;object.json@ref"]`}
                </div>
                <p className='mt-2 text-xs text-muted-foreground'>
                  {dict.queryHelper.placeholderSyntaxNote}
                </p>
              </div>
            </section>

            {/* Alternative S3 Syntax Section */}
            <section className='mb-4 px-2'>
              <Collapsible>
                <div className='rounded-md border bg-card'>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex w-full items-center justify-between p-2'
                    >
                      <h3 className='text-sm font-semibold'>
                        {dict.queryHelper.alternativeS3Syntax}
                      </h3>
                      <TbChevronDown className='size-4' />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-2'>
                    <p className='mb-3 text-xs text-muted-foreground'>
                      {dict.queryHelper.alternativeS3Description}
                    </p>
                    <div className='rounded-md bg-muted p-2 font-mono text-xs'>
                      {context
                        ? `read_json('s3://${context.repository}/${context.ref || 'main'}/sample.json')`
                        : `read_json('s3://workspace-repository/branch/sample.json')`}
                    </div>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {dict.queryHelper.s3FormatNote}
                    </p>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </section>

            <Separator className='my-4' />

            <div className='space-y-6 px-2'>
              {/* Context Section */}
              {context && (
                <section id='context'>
                  <div className='rounded-md border bg-card p-3 text-xs'>
                    <h3 className='mb-2 text-sm font-semibold'>
                      {dict.queryHelper.context}
                    </h3>
                    <div className='flex flex-col gap-3'>
                      <div className='flex flex-col gap-1'>
                        <span
                          className={`
                            text-[10px] font-bold tracking-wider
                            text-muted-foreground uppercase
                          `}
                        >
                          {dict.repository.repository}
                        </span>
                        <span className='font-mono'>{context.repository}</span>
                      </div>

                      <div className='flex flex-col gap-1'>
                        <span
                          className={`
                            text-[10px] font-bold tracking-wider
                            text-muted-foreground uppercase
                          `}
                        >
                          {dict.repository.objects.path}
                        </span>
                        <span className='font-mono break-all'>
                          {context.path}
                        </span>
                      </div>

                      {context.ref && (
                        <div className='flex flex-col gap-1'>
                          <span
                            className={`
                              text-[10px] font-bold tracking-wider
                              text-muted-foreground uppercase
                            `}
                          >
                            {dict.repository.branches.ref}
                          </span>
                          <span className='font-mono'>{context.ref}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
              {/* Schema & Selectors Section */}
              {(effectiveSchema?.schema || displaySelector) && (
                <section id='schema-and-selectors'>
                  <div className='rounded-md border p-3'>
                    {displaySelector && (
                      <>
                        <div className='mb-2 flex items-center justify-between'>
                          <span className='text-sm font-medium'>
                            {displayName}
                          </span>
                          <CopyButton
                            text={displaySelector}
                            label={dict.queryHelper.copySelector}
                          />
                        </div>
                        <div
                          className={`
                            mb-4 rounded bg-muted p-2 font-mono text-xs
                            break-all
                          `}
                        >
                          {displaySelector}
                        </div>
                      </>
                    )}

                    {/* Available Columns */}
                    {effectiveSchema?.schema && (
                      <div>
                        <h4
                          className={`
                            mb-2 text-xs font-semibold text-muted-foreground
                            uppercase
                          `}
                        >
                          {dict.queryHelper.availableColumns}
                        </h4>
                        <div
                          className={`
                            rounded-md border border-border bg-background/50 p-2
                          `}
                        >
                          <JSONSchemaViewer
                            schema={effectiveSchema.schema}
                            isExpanded={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Examples Section */}
              <section id='examples'>
                <h3 className='mb-4 text-sm font-semibold'>
                  {dict.queryHelper.examples}
                </h3>
                <div className='space-y-3'>
                  {/* Basic Examples */}
                  {displaySelector ? (
                    <>
                      <ExampleItem
                        title={dict.queryHelper.basicSelect}
                        code={`SELECT * FROM ${displaySelector} LIMIT 10;`}
                        explanation={dict.queryHelper.explanations.basicSelect}
                      />
                      <ExampleItem
                        title={dict.queryHelper.filterAndSort}
                        code={`SELECT * FROM ${displaySelector}\nWHERE id > 100\nORDER BY created_at DESC;`}
                        explanation={
                          dict.queryHelper.explanations.filterAndSort
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ExampleItem
                        title={dict.queryHelper.basicSelect}
                        code='SELECT * FROM $["repo;file.json@main"] LIMIT 10;'
                        explanation={dict.queryHelper.explanations.basicSelect}
                      />
                      <ExampleItem
                        title={dict.queryHelper.filterAndSort}
                        code={`SELECT * FROM $["repo;data.csv"]\nWHERE id > 100\nORDER BY created_at DESC;`}
                        explanation={
                          dict.queryHelper.explanations.filterAndSort
                        }
                      />
                    </>
                  )}

                  {/* Aggregations */}
                  {displaySelector ? (
                    <ExampleItem
                      title={dict.queryHelper.aggregations}
                      code={`SELECT category,\n  COUNT(*) as total,\n  AVG(value) as avg_value,\n  MIN(date_col) as earliest\nFROM ${displaySelector}\nWHERE date_col >= '2024-01-01'\nGROUP BY category\nORDER BY total DESC;`}
                      explanation={dict.queryHelper.explanations.aggregations}
                    />
                  ) : (
                    <ExampleItem
                      title={dict.queryHelper.aggregations}
                      code={`SELECT category,\n  COUNT(*) as total,\n  AVG(value) as avg_value,\n  MIN(date_col) as earliest\nFROM $["repo;data.json"]\nWHERE date_col >= '2024-01-01'\nGROUP BY category\nORDER BY total DESC;`}
                      explanation={dict.queryHelper.explanations.aggregations}
                    />
                  )}

                  {/* Window Functions */}
                  {displaySelector ? (
                    <ExampleItem
                      title={dict.queryHelper.windowFunctions}
                      code={`SELECT *,\n  ROW_NUMBER() OVER (PARTITION BY category ORDER BY value DESC) as rank,\n  LAG(value) OVER (ORDER BY date_col) as prev_value\nFROM ${displaySelector};`}
                      explanation={
                        dict.queryHelper.explanations.windowFunctions
                      }
                    />
                  ) : (
                    <ExampleItem
                      title={dict.queryHelper.windowFunctions}
                      code={`SELECT *,\n  ROW_NUMBER() OVER (PARTITION BY category ORDER BY value DESC) as rank,\n  LAG(value) OVER (ORDER BY date_col) as prev_value\nFROM $["repo;data.json"];`}
                      explanation={
                        dict.queryHelper.explanations.windowFunctions
                      }
                    />
                  )}

                  {/* Nested JSON */}
                  {isJsonObject ? (
                    <ExampleItem
                      title={dict.queryHelper.nestedJson}
                      code={
                        displaySelector
                          ? `SELECT d.*\nFROM ${displaySelector}\nCROSS JOIN UNNEST(data) AS t(d)\nWHERE d.type = 'active';`
                          : `SELECT d.*\nFROM $["repo;data.json"]\nCROSS JOIN UNNEST(data) AS t(d)\nWHERE d.type = 'active';`
                      }
                      explanation={dict.queryHelper.explanations.nestedJson}
                    />
                  ) : null}

                  {/* JSON Extract */}
                  {isJsonObject ? (
                    <ExampleItem
                      title={dict.queryHelper.jsonExtract}
                      code={
                        displaySelector
                          ? `SELECT\n  json_extract(data_column, '$.field_name') as extracted_field,\n  json_extract_string(data_column, '$.nested.field') as nested_field\nFROM ${displaySelector}\nWHERE json_valid(data_column);`
                          : `SELECT\n  json_extract(data_column, '$.field_name') as extracted_field,\n  json_extract_string(data_column, '$.nested.field') as nested_field\nFROM $["repo;json-data.json"]\nWHERE json_valid(data_column);`
                      }
                      explanation={dict.queryHelper.explanations.jsonExtract}
                    />
                  ) : null}

                  {/* Cross-Branch Query */}
                  {displaySelector ? (
                    <ExampleItem
                      title={dict.queryHelper.crossBranchQuery}
                      code={`SELECT 'main' AS branch, COUNT(*) FROM ${getSelectorWithRef(displaySelector, 'main')}\nUNION ALL\nSELECT 'dev' AS branch, COUNT(*) FROM ${getSelectorWithRef(displaySelector, 'dev')};`}
                      explanation={
                        dict.queryHelper.explanations.crossBranchQuery
                      }
                    />
                  ) : (
                    <ExampleItem
                      title={dict.queryHelper.crossBranchQuery}
                      code={`SELECT 'main' AS branch, COUNT(*) FROM $["repo;data.json@main"]\nUNION ALL\nSELECT 'dev' AS branch, COUNT(*) FROM $["repo;data.json@dev"];`}
                      explanation={
                        dict.queryHelper.explanations.crossBranchQuery
                      }
                    />
                  )}

                  {/* Time Series */}
                  {displaySelector ? (
                    <ExampleItem
                      title={dict.queryHelper.timeSeries}
                      code={`SELECT\n  DATE_TRUNC('hour', timestamp_col) as hour_bucket,\n  COUNT(*) as events_per_hour,\n  AVG(metric_value) as avg_metric\nFROM ${displaySelector}\nWHERE timestamp_col >= NOW() - INTERVAL 24 HOUR\nGROUP BY hour_bucket\nORDER BY hour_bucket;`}
                      explanation={dict.queryHelper.explanations.timeSeries}
                    />
                  ) : (
                    <ExampleItem
                      title={dict.queryHelper.timeSeries}
                      code={`SELECT\n  DATE_TRUNC('hour', timestamp_col) as hour_bucket,\n  COUNT(*) as events_per_hour,\n  AVG(metric_value) as avg_metric\nFROM $["repo;time-series.json"]\nWHERE timestamp_col >= NOW() - INTERVAL 24 HOUR\nGROUP BY hour_bucket\nORDER BY hour_bucket;`}
                      explanation={dict.queryHelper.explanations.timeSeries}
                    />
                  )}

                  {/* Native DuckDB S3 Example */}
                  {context && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <div
                          className={`
                            flex cursor-pointer items-center justify-between
                            rounded-md border bg-card
                          `}
                        >
                          <div
                            className={`
                              flex flex-1 items-center justify-between border-b
                              bg-muted/30 px-3 py-1.5
                            `}
                          >
                            <div className='flex items-center gap-1.5'>
                              <span className='text-xs font-medium'>
                                {dict.queryHelper.alternativeS3Example}
                              </span>
                            </div>
                            <TbChevronDown className='size-4' />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ExampleItem
                          title={dict.queryHelper.alternativeS3Example}
                          code={`SELECT * FROM read_json('s3://${context.repository}/${context.ref || 'main'}/sample.json') LIMIT 10;`}
                          explanation={
                            dict.queryHelper.alternativeS3ExampleExplanation
                          }
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={handleCopy}
      className='h-6 gap-1 px-2 text-xs'
    >
      {copied ? <TbCheck size={14} /> : <TbCopy size={14} />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </Button>
  );
}

function ExampleItem({
  title,
  code,
  explanation,
}: {
  title: string;
  code: string;
  explanation?: string;
}) {
  return (
    <div className='rounded-md border bg-card'>
      <div
        className={`
          flex items-center justify-between border-b bg-muted/30 px-3 py-1.5
        `}
      >
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-medium'>{title}</span>
          {explanation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      cursor-help text-muted-foreground
                      hover:text-foreground
                    `}
                  >
                    <TbInfoCircle size={14} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs text-xs'>
                  <p>{explanation}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CopyButton text={code} />
      </div>
      <div className='p-2'>
        <pre className='overflow-x-auto font-mono text-xs whitespace-pre-wrap'>
          {code}
        </pre>
      </div>
    </div>
  );
}
