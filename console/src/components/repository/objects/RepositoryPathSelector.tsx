'use client';

import { memo, useCallback, useId, useMemo, useState } from 'react';

import {
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbFile,
  TbFolder,
  TbFolderRoot,
} from 'react-icons/tb';

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
  inputId?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
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
  <div className={`h-10 w-full animate-pulse rounded-[2px] bg-muted`} />
);

const SkeletonTreeItem = ({ depth = 0 }: { depth?: number }) => (
  <div className='my-1' style={{ paddingLeft: `${depth * 1.5}rem` }}>
    <div className='flex items-center gap-2'>
      <div className={`size-4 animate-pulse rounded-[2px] bg-muted`} />
      <div className={`h-4 w-32 animate-pulse rounded-[2px] bg-muted`} />
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
 * @param props.repositoryRef - The ref in the repository
 * @param props.defaultPath - The default path to select
 * @param props.onPathChange - The callback to call when the path changes
 * @param props.loading - Whether the component is loading
 * @param props.defaultExpanded - Whether the component is expanded by default
 * @param props.groupOnly - Whether only groups can be selected
 * @param props.binaryOnly - Whether only binaries can be selected
 * @param props.structuredOnly - Whether only structured data can be selected
 * @param props.nonGroupOnly - Whether only non-group objects can be selected
 * @param props.existingOnly - Whether only existing paths can be selected
 * @param props.inputId - Optional id for the path input
 * @param props.ariaInvalid - Whether the path input has a validation error
 * @param props.ariaDescribedBy - Id of the path input's validation message
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
  inputId,
  ariaInvalid,
  ariaDescribedBy,
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
  const treeId = useId();
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

  // Helper to update both selectedPath and inputPath together
  const setPath = useCallback((formattedPath: string) => {
    setSelectedPath(formattedPath);
    setInputPath(formattedPath);
  }, []);

  // Derive validation from current input
  const isValidPath = useMemo(() => {
    if (existingOnly && rootObject) {
      const formattedPath = formatPath(inputPath, false, groupOnly);
      return findObjectByPath(rootObject, formattedPath) !== undefined;
    }
    return true;
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

  const renderItem = (
    item: RepositoryObject,
    index: number,
    parentKey = 'root'
  ) => {
    // Check if this item can be selected based on type constraints
    const canSelect = matchesTypeConstraints(
      item,
      groupOnly,
      binaryOnly,
      structuredOnly,
      nonGroupOnly
    );
    const itemPath = item.path ?? '';
    const itemLabel = item.path || dict.fileNavigator.rootDirectory;

    if (item.type === 'group') {
      const isOpen = Boolean(openFolders[itemPath]);
      const isSelected =
        canSelect && formatPath(itemPath, true, groupOnly) === selectedPath;
      const itemKey = itemPath
        ? encodeURIComponent(itemPath)
        : `${parentKey}-${index}`;
      const childrenId = `${treeId}-children-${itemKey}`;

      return (
        <div key={item.path || `group-${index}`} className='my-1'>
          <div
            className={`
              flex items-center justify-normal rounded-[2px] p-1 text-sm
              ${isSelected ? `bg-accent/15` : ''}
            `}
          >
            <button
              type='button'
              className={`
                flex min-h-6 cursor-pointer touch-manipulation appearance-none
                items-center rounded-[2px] border-0 bg-transparent p-0
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent
              `}
              aria-expanded={isOpen}
              aria-controls={childrenId}
              onClick={() => toggleFolder(item)}
            >
              {isOpen ? (
                <TbChevronDown aria-hidden='true' className='inline-block' />
              ) : (
                <TbChevronRight aria-hidden='true' className='inline-block' />
              )}
              <span className='ml-2'>
                <TbFolder aria-hidden='true' />
              </span>
              <span className='sr-only'>
                {isOpen
                  ? dict.repository.objects.hideChildren
                  : dict.repository.objects.showChildren}
                : {itemLabel}
              </span>
            </button>
            {canSelect ? (
              <button
                type='button'
                className={`
                  ml-2 min-h-6 cursor-pointer touch-manipulation appearance-none
                  border-0 bg-transparent p-0 text-left
                  hover:bg-accent/15 hover:underline
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-accent
                `}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => handleItemClick(item)}
              >
                {itemLabel}
              </button>
            ) : (
              <span className='ml-2'>{itemLabel}</span>
            )}
          </div>
          <div id={childrenId} hidden={!isOpen} className='pl-6'>
            {isOpen &&
              item.children?.map((child, idx) =>
                renderItem(child, idx, itemKey)
              )}
          </div>
        </div>
      );
    }

    const isSelected = formatPath(itemPath, false, groupOnly) === selectedPath;
    const itemClassName = `
      my-1 ml-6 flex min-h-6 items-center justify-normal rounded-[2px] p-1
      text-left text-sm
      ${
        canSelect
          ? `
            cursor-pointer
            ${
              isSelected
                ? `
                  bg-accent/15
                `
                : `
                  hover:bg-accent/15
                `
            }
          `
          : 'opacity-50'
      }
    `;
    const itemContent = (
      <>
        <span className='ml-2'>
          <TbFile aria-hidden='true' />
        </span>
        <span
          className={`
            ml-2
            ${canSelect ? 'hover:underline' : ''}
          `}
        >
          {itemLabel}
        </span>
      </>
    );

    if (!canSelect) {
      return (
        <div key={item.path || `item-${index}`} className={itemClassName}>
          {itemContent}
        </div>
      );
    }

    return (
      <button
        key={item.path || `item-${index}`}
        type='button'
        className={`
          ${itemClassName}
          touch-manipulation appearance-none border-0 bg-transparent
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-accent
        `}
        aria-current={isSelected ? 'true' : undefined}
        onClick={() => handleItemClick(item)}
      >
        {itemContent}
      </button>
    );
  };

  if (loading) {
    return (
      <div className='relative mb-2'>
        <div className='mb-2 flex items-center gap-2'>
          <SkeletonInput />
          <div
            className={`size-10 shrink-0 animate-pulse rounded-[2px] bg-muted`}
          />
        </div>
        {isExpanded && (
          <div
            className={`
              relative max-h-48 overflow-y-scroll border-b border-border pb-4
            `}
          >
            <div className='my-1'>
              <div
                className={`
                  flex items-center justify-normal rounded-[2px] p-1 text-sm
                `}
              >
                <span className='ml-2'>
                  <TbFolderRoot className='text-muted-foreground' />
                </span>
                <span className='ml-2'>
                  <div
                    className={`h-4 w-24 animate-pulse rounded-[2px] bg-muted`}
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
          id={inputId}
          value={inputPath}
          onChange={handlePathInput}
          placeholder={dict.repository.objects.enterPath}
          className={`
            w-full
            ${ariaInvalid || !isValidPath ? 'border-destructive' : ''}
          `}
          aria-invalid={ariaInvalid || !isValidPath}
          aria-describedby={ariaDescribedBy}
          disabled={loading}
        />
        <ButtonWithTooltip
          onClick={() => setIsExpanded((expanded) => !expanded)}
          variant='gray'
          tooltip={
            isExpanded
              ? dict.repository.objects.hideChildren
              : dict.repository.objects.showChildren
          }
          className='shrink-0'
          disabled={loading}
          aria-expanded={isExpanded}
          aria-controls={treeId}
        >
          {isExpanded ? <TbChevronUp /> : <TbChevronDown />}
        </ButtonWithTooltip>
      </div>

      {!isValidPath && existingOnly && (
        <div className='mb-2 text-sm text-destructive'>
          {dict.fileNavigator.errors.invalidPath}
        </div>
      )}

      {!existingOnly && inputPath && !isValidPath && (
        <div className={`mb-2 text-sm text-muted-foreground`}>
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
            {dict.common.view}
          </ButtonWithTooltip>
        )}

      <div
        id={treeId}
        hidden={!isExpanded}
        className={`
          relative max-h-48 overflow-y-scroll border-b border-border pb-4
        `}
      >
        <div className='my-1'>
          {isExpanded && rootObject && (
            <>
              {rootObject.type === 'group' && (
                <div className='my-1'>
                  {(() => {
                    const canSelectRoot = matchesTypeConstraints(
                      rootObject,
                      groupOnly,
                      binaryOnly,
                      structuredOnly,
                      nonGroupOnly
                    );
                    const isRootSelected =
                      formatPath(rootObject.path ?? '', true, groupOnly) ===
                      selectedPath;
                    const rootClassName = `
                        flex min-h-6 w-full items-center justify-normal
                        rounded-[2px] p-1 text-left text-sm
                        ${
                          canSelectRoot
                            ? `
                              cursor-pointer
                              hover:bg-accent/15
                            `
                            : ''
                        }
                        ${
                          isRootSelected
                            ? `
                              bg-accent/15
                            `
                            : ''
                        }
                      `;
                    const rootContent = (
                      <>
                        <span className='ml-2'>
                          <TbFolder aria-hidden='true' />
                        </span>
                        <span
                          className={`
                            ml-2
                            ${canSelectRoot ? 'hover:underline' : ''}
                          `}
                        >
                          {dict.fileNavigator.rootDirectory}
                        </span>
                      </>
                    );

                    if (!canSelectRoot) {
                      return <div className={rootClassName}>{rootContent}</div>;
                    }

                    return (
                      <button
                        type='button'
                        className={`
                          ${rootClassName}
                          touch-manipulation appearance-none border-0
                          bg-transparent
                          focus-visible:outline-2 focus-visible:outline-offset-2
                          focus-visible:outline-accent
                        `}
                        aria-current={isRootSelected ? 'true' : undefined}
                        onClick={() => handleItemClick(rootObject)}
                      >
                        {rootContent}
                      </button>
                    );
                  })()}
                </div>
              )}
              {rootObject.children?.map((item, idx) => renderItem(item, idx))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(RepositoryPathSelector);
