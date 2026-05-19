'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiFile, FiFolder } from 'react-icons/fi';
import {
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbLoader2,
} from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema, useConnectionSchemaFetcher } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Format a path according to the connection path rules:
 * - No leading slashes
 * - Trailing slash for directories or when groupOnly is true
 * - No double slashes
 * - Normalized path separators
 */
const formatPath = (
  path: string,
  isDirectory = false,
  groupOnly = false
): string => {
  // Remove leading slashes and normalize separators
  let formatted = path.replace(/^\/+/, '').replace(/\\/g, '/');

  // Remove any double slashes
  formatted = formatted.replace(/\/+/g, '/');

  // Add trailing slash for directories or when groupOnly is true
  if ((isDirectory || groupOnly) && !formatted.endsWith('/')) {
    formatted += '/';
  }

  // Remove trailing slash for files if not groupOnly
  if (!isDirectory && !groupOnly && formatted.endsWith('/')) {
    formatted = formatted.slice(0, -1);
  }

  return formatted;
};

/**
 * Check if an object matches the type constraints
 */
const matchesTypeConstraints = (
  obj: ObjectSchema,
  groupOnly?: boolean,
  binaryOnly?: boolean,
  structuredOnly?: boolean,
  nonGroupOnly?: boolean
): boolean => {
  if (groupOnly) return obj.type === 'group';
  if (binaryOnly) return obj.type === 'binary';
  if (structuredOnly) return obj.type === 'structured';
  if (nonGroupOnly) return obj.type !== 'group';
  return true;
};

/**
 * Find an object in the tree by path.
 *
 * `lazyChildren`, when provided, supplements `root.children` with results
 * that were fetched on demand as the user expanded folders in the picker.
 * Without this, paths under lazily-loaded groups would never match.
 */
const findObjectByPath = (
  root: ObjectSchema,
  path: string,
  lazyChildren?: Record<string, ObjectSchema[]>
): ObjectSchema | undefined => {
  if (root.path === path) return root;
  if (root.type === 'group') {
    const children =
      (root.path !== undefined && lazyChildren?.[root.path]) || root.children;
    if (children) {
      for (const child of children) {
        const found = findObjectByPath(child, path, lazyChildren);
        if (found) return found;
      }
    }
  }
  return undefined;
};

const SkeletonInput = () => (
  <div
    className={`
      h-10 w-full animate-pulse rounded-md bg-gray-200
      dark:bg-gray-800
    `}
  />
);

const SkeletonTreeItem = ({ depth = 0 }: { depth?: number }) => (
  <div className='my-1' style={{ paddingLeft: `${depth * 1.5}rem` }}>
    <div className='flex items-center gap-2'>
      <div
        className={`
          size-4 animate-pulse rounded-sm bg-gray-200
          dark:bg-gray-800
        `}
      />
      <div
        className={`
          h-4 w-32 animate-pulse rounded-sm bg-gray-200
          dark:bg-gray-800
        `}
      />
    </div>
  </div>
);

const SkeletonTree = () => (
  <div className='space-y-2'>
    <SkeletonTreeItem />
    <SkeletonTreeItem depth={1} />
    <SkeletonTreeItem depth={1} />
    <SkeletonTreeItem depth={2} />
    <SkeletonTreeItem depth={1} />
    <SkeletonTreeItem depth={2} />
    <SkeletonTreeItem depth={2} />
  </div>
);

/**
 * ConnectionPathSelector is a component that allows the user to select a path in the connection,
 * based on the schema of the connection.
 *
 * @param props - The component props
 * @param props.rootSchema - The root schema of the connection
 * @param props.connectionId - The id of the connection
 * @param props.operationMethod - The method to use to fetch the connection schema
 * @param props.defaultPath - The default path to select
 * @param props.onPathChange - The callback to call when the path changes
 * @param props.loading - Whether the component is loading
 * @param props.defaultExpanded - Whether the component is expanded by default
 * @param props.groupOnly - Whether only groups can be selected
 * @param props.binaryOnly - Whether only binaries can be selected
 * @param props.structuredOnly - Whether only structured data can be selected
 * @param props.nonGroupOnly - Whether only non-group objects can be selected
 * @param props.existingOnly - Whether only existing paths can be selected
 */
const ConnectionPathSelector = ({
  rootSchema: initialRootSchema,
  connectionId,
  operationMethod = 'pull',
  defaultPath,
  onPathChange,
  defaultExpanded = true,
  groupOnly = false,
  binaryOnly = false,
  structuredOnly = false,
  nonGroupOnly = false,
  existingOnly = false,
  loading: loadingProp = false,
}: {
  rootSchema?: ObjectSchema;
  connectionId: string;
  operationMethod?: 'pull' | 'push';
  defaultPath?: string;
  onPathChange: (path: string) => void;
  defaultExpanded?: boolean;
  groupOnly?: boolean;
  binaryOnly?: boolean;
  structuredOnly?: boolean;
  nonGroupOnly?: boolean;
  existingOnly?: boolean;
  loading?: boolean;
}) => {
  const { dict } = useLocale();

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [selectedPath, setSelectedPath] = useState<string>(
    formatPath(defaultPath || '', false, groupOnly) || (groupOnly ? '/' : '')
  );
  const [inputPath, setInputPath] = useState<string>(
    formatPath(defaultPath || '', false, groupOnly) || (groupOnly ? '/' : '')
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const { connectionSchemaQuery } = useConnectionSchema(
    connectionId,
    operationMethod
  );
  const { fetchPath } = useConnectionSchemaFetcher(
    connectionId,
    operationMethod
  );

  const [lazyChildren, setLazyChildren] = useState<
    Record<string, ObjectSchema[]>
  >({});
  const [lazyLoading, setLazyLoading] = useState<Record<string, boolean>>({});
  const [lazyError, setLazyError] = useState<Record<string, string | null>>({});

  // Generation counter bumped on every connection/operation switch. In-flight
  // loadLazyChildren calls capture the generation at call time and drop their
  // results if it no longer matches — otherwise a fetch that started against
  // connection A could write into the freshly-reset state for connection B
  // and lock that path out of refetch.
  const lazyGenerationRef = useRef(0);

  // Discard lazy state when the picker is pointed at a different connection
  // or operation. Done inline during render (not in an effect) so the very
  // first render with the new connection already sees cleared state —
  // otherwise a path collision between the old and new tree would render
  // stale lazy children for one frame before the effect fired. openFolders
  // resets too: a path left "open" with no lazy children would otherwise
  // render empty and toggleFolder would never fetch (willOpen is false).
  const connectionKey = `${connectionId}:${operationMethod ?? 'pull'}`;
  const [trackedKey, setTrackedKey] = useState(connectionKey);
  if (trackedKey !== connectionKey) {
    lazyGenerationRef.current += 1;
    setTrackedKey(connectionKey);
    setLazyChildren({});
    setLazyLoading({});
    setLazyError({});
    setOpenFolders({});
  }

  const loading = connectionSchemaQuery.isLoading || loadingProp;

  const rootSchema = connectionSchemaQuery.data?.data ?? initialRootSchema;

  /**
   * Resolve a node's children, preferring lazily-fetched results over the
   * server-provided `children` field when both are present.
   */
  const resolveChildren = useCallback(
    (item: ObjectSchema): ObjectSchema[] | undefined => {
      const lazy = lazyChildren[item.path ?? ''];
      if (lazy !== undefined) return lazy;
      return item.children;
    },
    [lazyChildren]
  );

  /**
   * A group node is "lazy" when the server returned no children at all
   * (children == null/undefined). An empty array means the folder has been
   * fully enumerated and is genuinely empty — do not refetch.
   */
  const isLazyNode = useCallback(
    (item: ObjectSchema): boolean => {
      if (item.type !== 'group') return false;
      if (item.children != null) return false;
      return lazyChildren[item.path ?? ''] === undefined;
    },
    [lazyChildren]
  );

  const loadLazyChildren = useCallback(
    async (path: string) => {
      const generation = lazyGenerationRef.current;
      const isCurrent = () => lazyGenerationRef.current === generation;
      setLazyLoading((prev) => ({ ...prev, [path]: true }));
      setLazyError((prev) => ({ ...prev, [path]: null }));
      try {
        const result = await fetchPath(path);
        if (!isCurrent()) return;
        setLazyChildren((prev) => ({
          ...prev,
          [path]: result.children ?? [],
        }));
      } catch (err) {
        if (!isCurrent()) return;
        setLazyError((prev) => ({
          ...prev,
          [path]: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        if (isCurrent()) {
          setLazyLoading((prev) => ({ ...prev, [path]: false }));
        }
      }
    },
    [fetchPath]
  );

  // Helper to update both selectedPath and inputPath together
  const setPath = useCallback((formattedPath: string) => {
    setSelectedPath(formattedPath);
    setInputPath(formattedPath);
  }, []);

  // Derive validation from current input
  const isValidPath = useMemo(() => {
    if (existingOnly && rootSchema) {
      const formattedPath = formatPath(inputPath, false, groupOnly);
      return (
        findObjectByPath(rootSchema, formattedPath, lazyChildren) !== undefined
      );
    }
    return true;
  }, [inputPath, existingOnly, rootSchema, groupOnly, lazyChildren]);

  // Handle manual path input
  const handlePathInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPath = e.target.value;
      const formattedPath = formatPath(newPath, false, groupOnly);
      setInputPath(newPath); // Keep raw input for display

      // Validate against the *new* input, not the memoised isValidPath
      // (which still reflects the previous inputPath until the next render).
      // Without this, a path that just became valid via lazy-load — or
      // simply by the user finishing a keystroke — would be rejected for
      // one frame. Treat a missing rootSchema as permissive (matches the
      // old behaviour) so a schema-load failure doesn't lock out input.
      const isCurrentValid =
        !existingOnly ||
        rootSchema === undefined ||
        findObjectByPath(rootSchema, formattedPath, lazyChildren) !== undefined;

      if (isCurrentValid) {
        setSelectedPath(formattedPath);
        onPathChange(formattedPath);
      }
    },
    [onPathChange, existingOnly, groupOnly, rootSchema, lazyChildren]
  );

  // A typed path can become valid *after* the keystroke when the user later
  // expands a folder and lazy children arrive. handlePathInput won't fire
  // again on its own, so selectedPath and the parent stay stuck at the last
  // valid value. Watch the validation inputs and propagate when the current
  // input becomes valid and differs from selectedPath. queueMicrotask keeps
  // the setState/onPathChange call out of the effect's synchronous body;
  // the cleanup flag cancels a queued propagation if the component unmounts
  // (or the deps change) before the microtask runs, so onPathChange never
  // fires on a stale parent.
  useEffect(() => {
    if (!existingOnly || !rootSchema) return;
    const formatted = formatPath(inputPath, false, groupOnly);
    if (formatted === selectedPath) return;
    if (findObjectByPath(rootSchema, formatted, lazyChildren) === undefined) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedPath(formatted);
      onPathChange(formatted);
    });
    return () => {
      cancelled = true;
    };
  }, [
    inputPath,
    existingOnly,
    rootSchema,
    lazyChildren,
    groupOnly,
    selectedPath,
    onPathChange,
  ]);

  /**
   * Toggle a folder in the path selector. If the folder is a lazy node
   * (group with no `children` returned yet), trigger a schema fetch for
   * its path on the first open.
   */
  // Refs mirroring state that toggleFolder reads imperatively. Keeping
  // these out of the dep array means toggleFolder (and the downstream
  // handleItemClick) keep stable identities across folder toggles and
  // lazy-load start/stop cycles — otherwise every state churn cascaded
  // into new callback identities for the whole render tree.
  const openFoldersRef = useRef(openFolders);
  openFoldersRef.current = openFolders;
  const lazyLoadingRef = useRef(lazyLoading);
  lazyLoadingRef.current = lazyLoading;

  const toggleFolder = useCallback(
    (item: ObjectSchema) => {
      if (item.path === undefined || item.type !== 'group') return;
      const path = item.path ?? '';
      const willOpen = !openFoldersRef.current[path];
      setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
      if (
        willOpen &&
        isLazyNode(item) &&
        !lazyLoadingRef.current[path] &&
        path.length > 0
      ) {
        void loadLazyChildren(path);
      }
    },
    [isLazyNode, loadLazyChildren]
  );

  /**
   * Handle clicking an item (folder or file) in the path selector
   */
  const handleItemClick = useCallback(
    (item: ObjectSchema) => {
      if (
        !matchesTypeConstraints(
          item,
          groupOnly,
          binaryOnly,
          structuredOnly,
          nonGroupOnly
        )
      ) {
        return;
      }

      if (item.type === 'group') {
        // Toggle folder open/close
        toggleFolder(item);
        // For directories, we want to keep the trailing slash
        const formattedPath = formatPath(item.path ?? '', true, groupOnly);
        setPath(formattedPath);
        onPathChange(formattedPath);
      } else {
        // For files, we don't want a trailing slash unless groupOnly is true
        const formattedPath = formatPath(item.path ?? '', false, groupOnly);
        setPath(formattedPath);
        onPathChange(formattedPath);
      }
    },
    [
      onPathChange,
      toggleFolder,
      setPath,
      groupOnly,
      binaryOnly,
      structuredOnly,
      nonGroupOnly,
    ]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const renderItem = (item: ObjectSchema, index: number) => {
    // Check if this item can be selected based on type constraints
    const canSelect = matchesTypeConstraints(
      item,
      groupOnly,
      binaryOnly,
      structuredOnly,
      nonGroupOnly
    );

    if (item.type === 'group') {
      return (
        <div key={item.path || `group-${index}`} className='my-1'>
          <div
            className={`
              flex items-center justify-normal rounded-md p-1 text-sm
              ${
                canSelect &&
                formatPath(item.path ?? '', true, groupOnly) === selectedPath
                  ? `
                    bg-gray-200
                    dark:bg-gray-800
                  `
                  : ''
              }
            `}
          >
            <div
              className='flex cursor-pointer items-center'
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFolder(item);
                }
              }}
              onClick={() => toggleFolder(item)}
            >
              {openFolders[item.path] ? (
                <TbChevronDown
                  className='inline-block'
                  aria-label={`Close group ${item.path} in the path selector`}
                />
              ) : (
                <TbChevronRight
                  className='inline-block'
                  aria-label={`Open folder ${item.path} in the path selector`}
                />
              )}
              <span className='ml-2'>
                <FiFolder />
              </span>
            </div>
            <span
              className={`
                ml-2
                ${
                  canSelect
                    ? `
                      cursor-pointer
                      hover:bg-gray-200 hover:underline
                      dark:hover:bg-gray-800
                    `
                    : ''
                }
              `}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (canSelect) {
                    handleItemClick(item);
                  }
                }
              }}
              onClick={() => {
                if (canSelect) {
                  handleItemClick(item);
                }
              }}
              aria-label={`Open ${item.path} group`}
            >
              {item.name || item.path || dict.fileNavigator.rootDirectory}
            </span>
          </div>
          {openFolders[item.path] &&
            (() => {
              const children = resolveChildren(item);
              const isLoading = lazyLoading[item.path ?? ''];
              const errMsg = lazyError[item.path ?? ''];
              const hasChildren = !!children && children.length > 0;
              // Match the pre-lazy behaviour: an open folder with nothing
              // to show (e.g. SFTP/MySQL groups with children: []) renders
              // no wrapper. The pl-6 div only appears when there's actual
              // content — spinner, error, or at least one child.
              if (!isLoading && !errMsg && !hasChildren) return null;
              return (
                <div className='pl-6'>
                  {isLoading && (
                    <div
                      className={`
                        my-1 flex items-center gap-2 p-1 text-sm
                        text-muted-foreground
                      `}
                    >
                      <TbLoader2 className='size-4 animate-spin' />
                      <span>{dict.common.loading}</span>
                    </div>
                  )}
                  {!isLoading && errMsg && (
                    <div
                      className={`
                        my-1 flex items-center gap-2 p-1 text-sm text-red-500
                      `}
                    >
                      <span>{dict.fileNavigator.errors.lazyLoadError}</span>
                      <button
                        type='button'
                        className='underline'
                        onClick={() => void loadLazyChildren(item.path ?? '')}
                      >
                        {dict.fileNavigator.errors.lazyRetry}
                      </button>
                    </div>
                  )}
                  {!isLoading &&
                    !errMsg &&
                    children &&
                    children.length > 0 &&
                    children.map((child, idx) => renderItem(child, idx))}
                </div>
              );
            })()}
        </div>
      );
    }

    return (
      <div
        key={item.path || `item-${index}`}
        className={`
          my-1 ml-6 flex items-center justify-normal rounded-md p-1 text-sm
          ${
            canSelect
              ? `
                cursor-pointer
                ${
                  formatPath(item.path ?? '', false, groupOnly) === selectedPath
                    ? `
                      bg-gray-200
                      dark:bg-gray-800
                    `
                    : `
                      hover:bg-gray-200
                      dark:hover:bg-gray-800
                    `
                }
              `
              : 'opacity-50'
          }
        `}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (canSelect) {
              handleItemClick(item);
            }
          }
        }}
        onClick={() => {
          if (canSelect) {
            handleItemClick(item);
          }
        }}
      >
        <span className='ml-2'>
          <FiFile />
        </span>
        <span
          className={`
            ml-2
            ${canSelect ? 'hover:underline' : ''}
          `}
          aria-label={`Select path ${item.path}`}
        >
          {item.name || item.path}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className='relative mb-2'>
        <div className='mb-2 flex items-center gap-2'>
          <SkeletonInput />
          <div
            className={`
              size-10 shrink-0 animate-pulse rounded-md bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
        {isExpanded && (
          <div
            className={`
              relative max-h-48 overflow-y-scroll border-b pb-4
              dark:border-b-gray-800
            `}
          >
            <div className='my-1'>
              <div
                className={`
                  flex items-center justify-normal rounded-md p-1 text-sm
                `}
              >
                <span className='ml-2'>
                  <FaFolderTree className='text-gray-400' />
                </span>
                <span className='ml-2'>
                  <div
                    className={`
                      h-4 w-24 animate-pulse rounded-sm bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                </span>
              </div>
              <SkeletonTree />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Don't render anything if connectionId or operationMethod are empty
  if (!connectionId || !operationMethod) {
    return <></>;
  }

  return (
    <div className='relative mb-2'>
      <div className='mb-2 flex items-center gap-2'>
        <Input
          value={inputPath}
          onChange={handlePathInput}
          placeholder={dict.repository.objects.enterPath}
          className={`
            w-full
            ${!isValidPath ? 'border-red-500' : ''}
          `}
          disabled={loading}
        />
        <ButtonWithTooltip
          onClick={() => setIsExpanded(!isExpanded)}
          variant='gray'
          tooltip={isExpanded ? 'Collapse tree view' : 'Expand tree view'}
          className='shrink-0'
          disabled={loading}
        >
          {isExpanded ? <TbChevronUp /> : <TbChevronDown />}
        </ButtonWithTooltip>
      </div>

      {!isValidPath && existingOnly && (
        <div className='mb-2 text-sm text-red-500'>
          {dict.fileNavigator.errors.invalidPath}
        </div>
      )}

      {!existingOnly && inputPath && !isValidPath && (
        <div
          className={`
            mb-2 text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          {dict.repository.objects.newObjectWillBeCreated}
        </div>
      )}

      {selectedPath &&
        selectedPath.length > 0 &&
        (!existingOnly || isValidPath) &&
        rootSchema &&
        findObjectByPath(rootSchema, selectedPath, lazyChildren) && (
          <ButtonWithTooltip
            href={`${workspaceUrl}/connections/${connectionId}/schema?path=${selectedPath}&method=${operationMethod}`}
            target='_blank'
            variant='gray'
            tooltip={selectedPath}
            className='mb-2 w-full'
          >
            {dict.common.view}
          </ButtonWithTooltip>
        )}

      {isExpanded && (
        <div
          id='file-selector'
          className={`
            relative max-h-48 overflow-y-scroll border-b pb-4
            dark:border-b-gray-800
          `}
        >
          <div className='my-1'>
            {rootSchema && (
              <>
                {rootSchema.type === 'group' && (
                  <div className='my-1'>
                    <div
                      className={`
                        flex items-center justify-normal rounded-md p-1 text-sm
                        ${
                          matchesTypeConstraints(
                            rootSchema,
                            groupOnly,
                            binaryOnly,
                            structuredOnly,
                            nonGroupOnly
                          )
                            ? `
                              cursor-pointer
                              hover:bg-gray-200
                              dark:hover:bg-gray-800
                            `
                            : ''
                        }
                        ${
                          formatPath(
                            rootSchema?.path ?? '',
                            true,
                            groupOnly
                          ) === selectedPath
                            ? `
                              bg-gray-200
                              dark:bg-gray-800
                            `
                            : ''
                        }
                      `}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (
                            matchesTypeConstraints(
                              rootSchema,
                              groupOnly,
                              binaryOnly,
                              structuredOnly,
                              nonGroupOnly
                            )
                          ) {
                            handleItemClick(rootSchema);
                          }
                        }
                      }}
                      onClick={() =>
                        matchesTypeConstraints(
                          rootSchema,
                          groupOnly,
                          binaryOnly,
                          structuredOnly,
                          nonGroupOnly
                        ) && handleItemClick(rootSchema)
                      }
                    >
                      <span className='ml-2'>
                        <FiFolder />
                      </span>
                      <span
                        className={`
                          ml-2
                          ${
                            matchesTypeConstraints(
                              rootSchema,
                              groupOnly,
                              binaryOnly,
                              structuredOnly,
                              nonGroupOnly
                            )
                              ? 'hover:underline'
                              : ''
                          }
                        `}
                        aria-label={`Select root directory`}
                      >
                        {dict.fileNavigator.rootDirectory}
                      </span>
                    </div>
                  </div>
                )}
                {rootSchema.type === 'group' &&
                  resolveChildren(rootSchema)?.map((item, idx) =>
                    renderItem(item, idx)
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ConnectionPathSelector);
