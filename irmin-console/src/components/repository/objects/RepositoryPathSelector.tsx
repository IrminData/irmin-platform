'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { FaFolderTree } from 'react-icons/fa6';
import { FiFile, FiFolder } from 'react-icons/fi';
import { TbChevronDown, TbChevronRight, TbChevronUp } from 'react-icons/tb';

import IrminCore from '@/lib/core';
import { getToken } from '@/lib/getToken';

import { ButtonWithTooltip } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Object } from '@/types/core/Object';

interface RepositoryPathSelectorProps {
  rootObject?: Object;
  repositorySlug: string;
  ref: string;
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
  isDirectory: boolean = false,
  groupOnly: boolean = false
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
  obj: Object,
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
const findObjectByPath = (root: Object, path: string): Object | undefined => {
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
  <div className='h-10 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800' />
);

const SkeletonTreeItem = ({ depth = 0 }: { depth?: number }) => (
  <div className='my-1' style={{ paddingLeft: `${depth * 1.5}rem` }}>
    <div className='flex items-center gap-2'>
      <div className='h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
      <div className='h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
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
  ref,
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
  const { workspaceSlug } = useWorkspace();
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();

  const [loading, setLoading] = useState<boolean>(loadingProp);
  const [rootObject, setRootObject] = useState<Object | undefined>(
    initialRootObject
  );
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [selectedPath, setSelectedPath] = useState<string>(
    defaultPath ? formatPath(defaultPath, false, groupOnly) : ''
  );
  const [inputPath, setInputPath] = useState<string>(
    defaultPath ? formatPath(defaultPath, false, groupOnly) : ''
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isValidPath, setIsValidPath] = useState<boolean>(true);

  const rootObjectFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!repositorySlug || !ref) return;
    if (initialRootObject) return;
    const newRootObjectFetchedRef = `${workspaceSlug}-${repositorySlug}-${ref}`;
    if (rootObjectFetchedRef.current === newRootObjectFetchedRef) return;
    rootObjectFetchedRef.current = newRootObjectFetchedRef;
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const newRootObject = await irminCore.objectService.getObjectAtPath({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: '/',
          ref: ref,
        });
        setRootObject(newRootObject?.data ?? undefined);
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch the root object'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [
    initialRootObject,
    repositorySlug,
    ref,
    locale,
    workspaceSlug,
    irminAlert,
  ]);

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
  const toggleFolder = useCallback((item: Object) => {
    if (item.path && item.type === 'group') {
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
    (item: Object) => {
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

  const renderItem = (item: Object) => {
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
        <div key={item.path} className='my-1'>
          <div className='flex items-center justify-normal rounded-md p-1 text-sm'>
            <div
              className='flex cursor-pointer items-center'
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
              className={`ml-2 ${canSelect ? 'cursor-pointer hover:bg-gray-200 hover:underline dark:hover:bg-gray-800' : ''}`}
              onClick={() => canSelect && handleItemClick(item)}
              aria-label={`Open ${item.path} group`}
            >
              {item.path || dict.fileNavigator.rootDirectory}
            </span>
          </div>
          {openFolders[item.path] &&
            item.children &&
            item.children.length > 0 && (
              <div className='pl-6'>
                {item.children.map((child) => renderItem(child))}
              </div>
            )}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={`my-1 ml-6 flex items-center justify-normal rounded-md p-1 text-sm ${
          canSelect
            ? `cursor-pointer ${
                item.path === selectedPath
                  ? 'bg-gray-200 dark:bg-gray-800'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800'
              }`
            : 'opacity-50'
        }`}
        onClick={() => canSelect && handleItemClick(item)}
      >
        <span className='ml-2'>
          <FiFile />
        </span>
        <span
          className={`ml-2 ${canSelect ? 'hover:underline' : ''}`}
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
          <div className='h-10 w-10 shrink-0 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800' />
        </div>
        {isExpanded && (
          <div className='relative max-h-48 overflow-y-scroll border-b pb-4 dark:border-b-gray-800'>
            <div className='my-1'>
              <div className='flex items-center justify-normal rounded-md p-1 text-sm'>
                <span className='ml-2'>
                  <FaFolderTree className='text-gray-400' />
                </span>
                <span className='ml-2'>
                  <div className='h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
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
  if (!repositorySlug || !ref) {
    return <></>;
  }

  return (
    <div className='relative mb-2'>
      <div className='mb-2 flex items-center gap-2'>
        <Input
          value={inputPath}
          onChange={handlePathInput}
          placeholder={dict.repository.objects.enterPath}
          className={`w-full ${!isValidPath ? 'border-red-500' : ''}`}
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
        <div className='mb-2 text-sm text-gray-500 dark:text-gray-400'>
          {dict.repository.objects.newObjectWillBeCreated}
        </div>
      )}

      {selectedPath &&
        selectedPath.length > 0 &&
        (!existingOnly || isValidPath) &&
        rootObject &&
        findObjectByPath(rootObject, selectedPath) && (
          <ButtonWithTooltip
            href={`${workspaceUrl}/repositories/${repositorySlug}/object?path=${selectedPath}&ref=${ref}`}
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
          className='relative max-h-48 overflow-y-scroll border-b pb-4 dark:border-b-gray-800'
        >
          <div className='my-1'>
            {rootObject && (
              <>
                {rootObject.type === 'group' && (
                  <div className='my-1'>
                    <div
                      className={`flex items-center justify-normal rounded-md p-1 text-sm ${
                        matchesTypeConstraints(
                          rootObject,
                          groupOnly,
                          binaryOnly,
                          structuredOnly,
                          nonGroupOnly
                        )
                          ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800'
                          : ''
                      }`}
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
                        className={`ml-2 ${
                          matchesTypeConstraints(
                            rootObject,
                            groupOnly,
                            binaryOnly,
                            structuredOnly,
                            nonGroupOnly
                          )
                            ? 'hover:underline'
                            : ''
                        }`}
                        aria-label={`Select root directory`}
                      >
                        {dict.fileNavigator.rootDirectory}
                      </span>
                    </div>
                  </div>
                )}
                {rootObject.children?.map((item) => renderItem(item))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RepositoryPathSelector);
