'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MdFolder } from 'react-icons/md';
import { TbLoader2 } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

// eslint-disable-next-line import-x/no-cycle
import ObjectSchemaViewer from '.';

/**
 * Component to visualise a group schema object
 */
export function GroupItemViewer({
  item,
  depth = 0,
  isExpanded = false,
  focusedPath,
  isFocused = false,
  loadChildren,
}: {
  /** The group item plus metadata */
  item: ObjectSchema;
  /** nesting depth */
  depth?: number;
  /** Whether to start expanded */
  isExpanded?: boolean;
  /** The path to focus on */
  focusedPath?: string;
  /** Whether this item is focused */
  isFocused?: boolean;
  /**
   * Optional fetcher for lazy schema branches. When set and `item.children`
   * is null/undefined, expanding this group triggers a fetch for
   * `item.path` and renders the resolved children inline.
   */
  loadChildren?: (path: string) => Promise<ObjectSchema>;
}) {
  const { dict, locale } = useLocale();
  const [expanded, setExpanded] = useState(isExpanded && depth < 1);
  const [lazyChildren, setLazyChildren] = useState<ObjectSchema[] | undefined>(
    undefined
  );
  const [lazyLoading, setLazyLoading] = useState(false);
  const [lazyError, setLazyError] = useState<string | null>(null);

  const isGroup = item.type === 'group';
  const children = item.children ?? lazyChildren;
  const isLazy =
    isGroup &&
    loadChildren !== undefined &&
    item.children == null &&
    lazyChildren === undefined;
  const childCount = children?.length ?? (isLazy ? undefined : 0);

  // Callers that switch the source connection should key the SchemaViewer
  // subtree (e.g. by connectionID) so this component unmounts and remounts
  // with fresh state — that's the contract for avoiding stale lazy results
  // across connections, since each GroupItemViewer holds its own local state.
  const runLazyLoad = useCallback(async () => {
    if (!loadChildren || !item.path) return;
    setLazyLoading(true);
    setLazyError(null);
    try {
      const result = await loadChildren(item.path);
      setLazyChildren(result.children ?? []);
    } catch (err) {
      setLazyError(err instanceof Error ? err.message : String(err));
    } finally {
      setLazyLoading(false);
    }
  }, [loadChildren, item.path]);

  const handleToggle = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && isLazy && !lazyLoading) {
      void runLazyLoad();
    }
  };

  // Top-level groups can mount already expanded (isExpanded && depth < 1).
  // If such a node is lazy, the user never sees children without clicking
  // collapse + expand again. Trigger the fetch once when the expanded-lazy
  // combination first becomes true. A ref guards against re-firing — once
  // we've kicked off the auto-load, lazy state transitions handle the rest.
  // The fetch is queued in a microtask so setState happens outside the
  // effect's synchronous body.
  const autoLoadFiredRef = useRef(false);
  useEffect(() => {
    if (autoLoadFiredRef.current) return;
    if (!expanded || !isLazy) return;
    autoLoadFiredRef.current = true;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void runLazyLoad();
    });
    return () => {
      cancelled = true;
    };
  }, [expanded, isLazy, runLazyLoad]);

  if (!isGroup) return <></>;

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
        <MdFolder
          className={`
            mt-1 size-6 shrink-0 text-yellow-500
            dark:text-yellow-300
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
                {formatTimestamp(item.last_modified, locale)}
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
              {dict.repository.objects.type}: {dict.repository.objects.group}
            </span>
            <span>
              {dict.repository.objects.children}:{' '}
              {childCount === undefined ? '?' : childCount}
            </span>
          </div>
          <Button
            className='mt-2 -ml-2'
            variant='ghost'
            onClick={handleToggle}
            aria-expanded={expanded}
          >
            {expanded
              ? dict.repository.objects.hideChildren
              : `${dict.repository.objects.showChildren}${
                  childCount === undefined ? '' : ` (${childCount})`
                }`}
          </Button>
          {expanded && (
            <div className='mt-3 space-y-3 pl-2'>
              {lazyLoading && (
                <div
                  className={`
                    flex items-center gap-2 text-sm text-muted-foreground
                  `}
                >
                  <TbLoader2 className='size-4 animate-spin' />
                  <span>{dict.common.loading}</span>
                </div>
              )}
              {!lazyLoading && lazyError && (
                <div className='flex items-center gap-2 text-sm text-red-500'>
                  <span>{dict.fileNavigator.errors.lazyLoadError}</span>
                  <button
                    type='button'
                    className='underline'
                    onClick={() => void runLazyLoad()}
                  >
                    {dict.fileNavigator.errors.lazyRetry}
                  </button>
                </div>
              )}
              {!lazyLoading &&
                !lazyError &&
                children?.map((child, index) => (
                  <ObjectSchemaViewer
                    key={child.path || `child-${index}`}
                    schema={child}
                    depth={depth + 1}
                    isExpanded={isExpanded}
                    focusedPath={focusedPath}
                    loadChildren={loadChildren}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
