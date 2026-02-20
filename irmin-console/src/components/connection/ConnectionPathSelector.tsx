'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiFile, FiFolder } from 'react-icons/fi';
import { TbChevronDown, TbChevronRight, TbChevronUp } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema } from '@/hooks/api';
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
 * Find an object in the tree by path
 */
const findObjectByPath = (
  root: ObjectSchema,
  path: string
): ObjectSchema | undefined => {
  if (root.path === path) return root;
  if (root.type === 'group' && root.children) {
    for (const child of root.children) {
      const found = findObjectByPath(child, path);
      if (found) return found;
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
          size-4 animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
      <div
        className={`
          h-4 w-32 animate-pulse rounded bg-gray-200
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

  const loading = connectionSchemaQuery.isLoading || loadingProp;

  const rootSchema = connectionSchemaQuery.data?.data ?? initialRootSchema;

  // Helper to update both selectedPath and inputPath together
  const setPath = useCallback((formattedPath: string) => {
    setSelectedPath(formattedPath);
    setInputPath(formattedPath);
  }, []);

  // Derive validation from current input
  const isValidPath = useMemo(() => {
    if (existingOnly && rootSchema) {
      const formattedPath = formatPath(inputPath, false, groupOnly);
      return findObjectByPath(rootSchema, formattedPath) !== undefined;
    }
    return true;
  }, [inputPath, existingOnly, rootSchema, groupOnly]);

  // Handle manual path input
  const handlePathInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPath = e.target.value;
      const formattedPath = formatPath(newPath, false, groupOnly);
      setInputPath(newPath); // Keep raw input for display

      // Only update if path is valid or we don't require existing paths
      if (!existingOnly || isValidPath) {
        setSelectedPath(formattedPath);
        onPathChange(formattedPath);
      }
    },
    [onPathChange, existingOnly, isValidPath, groupOnly]
  );

  /**
   * Toggle a folder in the path selector
   */
  const toggleFolder = useCallback((item: ObjectSchema) => {
    if (item.path !== undefined && item.type === 'group') {
      setOpenFolders((prev) => ({
        ...prev,
        [item.path ?? '']: !prev[item.path ?? ''],
      }));
    }
  }, []);

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
              {item.path || dict.fileNavigator.rootDirectory}
            </span>
          </div>
          {openFolders[item.path] &&
            item.children &&
            item.children.length > 0 && (
              <div className='pl-6'>
                {item.children.map((child, idx) => renderItem(child, idx))}
              </div>
            )}
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
          {item.path}
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
                      h-4 w-24 animate-pulse rounded bg-gray-200
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
        findObjectByPath(rootSchema, selectedPath) && (
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
                  rootSchema.children?.map((item, idx) =>
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
