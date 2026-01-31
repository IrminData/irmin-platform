'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiFile, FiFolder } from 'react-icons/fi';
import { TbChevronDown, TbChevronRight, TbChevronUp } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

import { useRepositoryObject } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { RepositoryObject } from '@/types/core/RepositoryObject';

interface RepositoryPathSelectorProps {
  rootObject?: RepositoryObject;
  repositorySlug: string;
  repositoryRef: string;
  defaultPath?: string;
  onPathChange: (path: string) => void;
  defaultExpanded?: boolean;
  groupOnly?: boolean;
  binaryOnly?: boolean;
  structuredOnly?: boolean;
  nonGroupOnly?: boolean;
  existingOnly?: boolean;
  loading?: boolean;
}

/**
 * Format a path according to the repository path rules:
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
  obj: RepositoryObject,
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
  root: RepositoryObject,
  path: string
): RepositoryObject | undefined => {
  if (root.path === path) return root;
  if (root.children) {
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
 * RepositoryPathSelector is a component that allows the user to select a path in the repository,
 * based on the list of objects in the repository.
 *
 * @param props - The component props
 * @param props.rootObject - The root directory object of the repository
 * @param props.repositorySlug - The slug of the repository
 * @param props.ref - The ref in the repository
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
const RepositoryPathSelector = ({
  rootObject: initialRootObject,
  repositorySlug,
  repositoryRef,
  defaultPath,
  onPathChange,
  defaultExpanded = true,
  groupOnly = false,
  binaryOnly = false,
  structuredOnly = false,
  nonGroupOnly = false,
  existingOnly = false,
  loading: loadingProp = false,
}: RepositoryPathSelectorProps) => {
  const { dict } = useLocale();

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [selectedPath, setSelectedPath] = useState<string>(
    formatPath(defaultPath || '', false, groupOnly) || (groupOnly ? '/' : '')
  );
  const [inputPath, setInputPath] = useState<string>(
    formatPath(defaultPath || '', false, groupOnly) || (groupOnly ? '/' : '')
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isValidPath, setIsValidPath] = useState<boolean>(true);

  const { repositoryObjectQuery } = useRepositoryObject(
    repositorySlug,
    repositoryRef,
    '/'
  );
  const rootObject = useMemo(
    () => repositoryObjectQuery.data?.data ?? initialRootObject,
    [repositoryObjectQuery.data?.data, initialRootObject]
  );
  const loading = useMemo(
    () => repositoryObjectQuery.isLoading || loadingProp,
    [repositoryObjectQuery.isLoading, loadingProp]
  );

  // Keep input in sync with selected path
  useEffect(() => {
    setInputPath(selectedPath);
  }, [selectedPath]);

  // Validate path when input changes
  useEffect(() => {
    if (existingOnly && rootObject) {
      const formattedPath = formatPath(inputPath, false, groupOnly);
      const exists = findObjectByPath(rootObject, formattedPath) !== undefined;
      setIsValidPath(exists);
    } else {
      setIsValidPath(true);
    }
  }, [inputPath, existingOnly, rootObject, groupOnly]);

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
  const toggleFolder = useCallback((item: RepositoryObject) => {
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
    (item: RepositoryObject) => {
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
        setSelectedPath(formattedPath);
        onPathChange(formattedPath);
      } else {
        // For files, we don't want a trailing slash unless groupOnly is true
        const formattedPath = formatPath(item.path ?? '', false, groupOnly);
        setSelectedPath(formattedPath);
        onPathChange(formattedPath);
      }
    },
    [
      onPathChange,
      toggleFolder,
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

  const renderItem = (item: RepositoryObject, index: number) => {
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
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (canSelect) {
                    handleItemClick(item);
                  }
                }
              }}
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
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
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

  // Don't render anything if repositorySlug or ref are empty
  if (!repositorySlug || !repositoryRef) {
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
        rootObject &&
        findObjectByPath(rootObject, selectedPath) && (
          <ButtonWithTooltip
            href={`${workspaceUrl}/repositories/${repositorySlug}/object?path=${selectedPath}&ref=${repositoryRef}`}
            target='_blank'
            variant='gray'
            tooltip={selectedPath}
            className='mb-2 w-full'
          >
            {dict.list.view}
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
            {rootObject && (
              <>
                {rootObject.type === 'group' && (
                  <div className='my-1'>
                    <div
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (
                            matchesTypeConstraints(
                              rootObject,
                              groupOnly,
                              binaryOnly,
                              structuredOnly,
                              nonGroupOnly
                            )
                          ) {
                            handleItemClick(rootObject);
                          }
                        }
                      }}
                      className={`
                        flex items-center justify-normal rounded-md p-1 text-sm
                        ${
                          matchesTypeConstraints(
                            rootObject,
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
                      `}
                      onClick={() =>
                        matchesTypeConstraints(
                          rootObject,
                          groupOnly,
                          binaryOnly,
                          structuredOnly,
                          nonGroupOnly
                        ) && handleItemClick(rootObject)
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
                              rootObject,
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
                {rootObject.children?.map((item, idx) => renderItem(item, idx))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RepositoryPathSelector);
