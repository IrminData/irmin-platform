'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { LuSearchX } from 'react-icons/lu';
import {
  TbArrowsSort,
  TbChevronDown,
  TbChevronRight,
  TbDotsVertical,
  TbFile,
  TbFolder,
  TbTable,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/loading/TableSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';

import { useRepositoryObject } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { RepositoryObject } from '@/types/core/RepositoryObject';

interface RepositoryFiletreeProps {
  currentPath?: string;
  repositorySlug: string;
  repositoryRef: string;
}

/**
 * Recursively sorts a tree structure while preserving parent-child relationships.
 * Only sorts siblings at each level, maintaining the hierarchical structure.
 */
function sortTreeRecursive(
  obj: RepositoryObject,
  sortKey: 'content_type' | 'last_modified' | 'name' | 'path',
  direction: 'ascending' | 'descending'
): RepositoryObject {
  const sorted = { ...obj };

  if (sorted.children && sorted.children.length > 0) {
    // Sort children (siblings only)
    const sortedChildren = [...sorted.children].sort((a, b) => {
      const aValue = a[sortKey] ?? '';
      const bValue = b[sortKey] ?? '';
      if (aValue < bValue) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    // Recursively sort each child's subtree
    sorted.children = sortedChildren.map((child) =>
      sortTreeRecursive(child, sortKey, direction)
    );
  }

  return sorted;
}

/**
 * Flattens a tree structure while preserving depth information.
 * Only includes objects that are visible based on expanded state.
 */
function flattenTreeWithDepth(
  obj: RepositoryObject,
  depth: number,
  expanded: Record<string, boolean>,
  searchTerm: string
): Array<{ object: RepositoryObject; depth: number }> {
  const lowerSearch = searchTerm.toLowerCase();
  const matchesSearch = (path: string, name: string) =>
    path.toLowerCase().includes(lowerSearch) ||
    name.toLowerCase().includes(lowerSearch);

  const result: Array<{ object: RepositoryObject; depth: number }> = [];

  // If searching, include all matching objects regardless of expansion
  if (searchTerm) {
    const addAllMatching = (
      item: RepositoryObject,
      currentDepth: number
    ): Array<{ object: RepositoryObject; depth: number }> => {
      // Check if this item matches the search
      const itemMatches = matchesSearch(item.path, item.name);

      // Recursively collect matching children
      const childrenResults: Array<{
        object: RepositoryObject;
        depth: number;
      }> = [];
      let hasMatchingDescendant = false;

      if (item.children) {
        for (const child of item.children) {
          const childResults = addAllMatching(child, currentDepth + 1);
          if (childResults.length > 0) {
            hasMatchingDescendant = true;
            childrenResults.push(...childResults);
          }
        }
      }

      // Include this item if it matches OR if any descendant matches
      // Add parent before children to maintain correct depth order
      if (itemMatches || hasMatchingDescendant) {
        const result: Array<{ object: RepositoryObject; depth: number }> = [];
        result.push({ object: item, depth: currentDepth });
        result.push(...childrenResults);
        return result;
      }

      return [];
    };
    return addAllMatching(obj, depth);
  }

  // Normal tree traversal with expansion
  result.push({ object: obj, depth });
  if (obj.type === 'group' && expanded[obj.path ?? ''] && obj.children) {
    obj.children.forEach((child) => {
      result.push(
        ...flattenTreeWithDepth(child, depth + 1, expanded, searchTerm)
      );
    });
  }

  return result;
}

/**
 * RepositoryFiletree component for navigating between objects on the single object page.
 * Displays a file tree in table format (like ObjectList) where clicking on objects navigates to their single object page.
 *
 * @param props - The component props
 * @param props.currentPath - The path of the currently viewed object
 * @param props.repositorySlug - The slug of the repository
 * @param props.repositoryRef - The ref in the repository
 */
const RepositoryFiletree = ({
  currentPath,
  repositorySlug,
  repositoryRef,
}: RepositoryFiletreeProps) => {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [userToggledFolders, setUserToggledFolders] = useState<
    Record<string, boolean>
  >({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'content_type' | 'last_modified' | 'name' | 'path';
    direction: 'ascending' | 'descending';
  }>({ key: 'name', direction: 'ascending' });

  const { repositoryObjectQuery } = useRepositoryObject(
    repositorySlug,
    repositoryRef,
    '/'
  );

  const rootObject = useMemo(
    () => repositoryObjectQuery.data?.data,
    [repositoryObjectQuery.data?.data]
  );

  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Compute which folders should be expanded to show current path
  const foldersToExpand = useMemo(() => {
    if (!currentPath || !rootObject) return {};

    const pathParts = currentPath.split('/').filter(Boolean);
    const expanded: Record<string, boolean> = {};
    let current = rootObject;

    for (const part of pathParts) {
      const fullPath =
        current.path && current.path !== '/' ? `${current.path}/${part}` : part;
      expanded[fullPath] = true;

      if (current.children) {
        const found = current.children.find((child) => child.path === fullPath);
        if (found) {
          current = found;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return expanded;
  }, [currentPath, rootObject]);

  const toggleFolder = useCallback(
    (item: RepositoryObject) => {
      if (item.path !== undefined && item.type === 'group') {
        setUserToggledFolders((prev) => {
          // Compute the current merged state (foldersToExpand + userToggledFolders)
          const currentMerged = { ...foldersToExpand, ...prev };
          const currentPath = item.path ?? '';
          const isCurrentlyExpanded = currentMerged[currentPath] ?? false;

          // Toggle to the opposite of the current merged state
          return {
            ...prev,
            [currentPath]: !isCurrentlyExpanded,
          };
        });
      }
    },
    [foldersToExpand]
  );

  const handleObjectClick = useCallback(
    (item: RepositoryObject) => {
      if (item.type === 'group') {
        toggleFolder(item);
      } else {
        router.push(
          `${baseUrl}/object?path=${encodeURIComponent(item.path)}&ref=${encodeURIComponent(repositoryRef)}`
        );
      }
    },
    [baseUrl, repositoryRef, router, toggleFolder]
  );

  // Merge computed folders (from path) with user-toggled folders
  const openFolders = useMemo(
    () => ({ ...foldersToExpand, ...userToggledFolders }),
    [foldersToExpand, userToggledFolders]
  );

  // Sort tree recursively (preserving hierarchy) then flatten
  // Skip the root object itself, only show its children
  const filteredAndSorted = useMemo(() => {
    if (!rootObject) return [];
    if (rootObject.children && rootObject.children.length > 0) {
      // Sort root's immediate children first
      const sortedRootChildren = [...rootObject.children].sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });

      // Recursively sort each child's subtree
      const sortedChildren = sortedRootChildren.map((child) =>
        sortTreeRecursive(child, sortConfig.key, sortConfig.direction)
      );

      // Flatten each child starting at depth 0 (they'll appear at top level)
      return sortedChildren.flatMap((child) =>
        flattenTreeWithDepth(child, 0, openFolders, searchTerm)
      );
    }
    // If no children, return empty array (don't show root)
    return [];
  }, [rootObject, openFolders, searchTerm, sortConfig]);

  const handleSort = useCallback(
    (key: 'content_type' | 'last_modified' | 'name' | 'path') => {
      setSortConfig((prevConfig) => ({
        key,
        direction:
          prevConfig.key === key && prevConfig.direction === 'ascending'
            ? 'descending'
            : 'ascending',
      }));
    },
    []
  );

  const getIcon = useCallback((type: RepositoryObject['type']) => {
    switch (type) {
      case 'group':
        return (
          <TbFolder
            className={`
              size-5 text-yellow-500
              dark:text-yellow-400
            `}
          />
        );
      case 'structured':
        return (
          <TbTable
            className={`
              size-5 text-blue-500
              dark:text-blue-400
            `}
          />
        );
      case 'binary':
        return (
          <TbFile
            className={`
              size-5 text-gray-500
              dark:text-gray-400
            `}
          />
        );
    }
  }, []);

  if (repositoryObjectQuery.isLoading) {
    return (
      <div className='mb-4 w-full overflow-hidden rounded-lg border border-card'>
        {/* Search header skeleton */}
        <div
          className={`
            flex items-center justify-start gap-2 rounded-lg border-b
            border-gray-200 bg-background px-4 py-2
            dark:border-gray-800
          `}
        >
          <div
            className={`
              h-9 w-full max-w-sm animate-pulse rounded-md bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>

        {/* Table skeleton */}
        <div className='max-h-[400px] w-full overflow-scroll bg-background'>
          <TableSkeleton rows={6} columns={4} showHeader={true} />
        </div>
      </div>
    );
  }

  if (repositoryObjectQuery.error) {
    return (
      <div className='mb-4 w-full overflow-hidden rounded-lg border border-card'>
        <div className='p-8'>
          <QueryError
            error={repositoryObjectQuery.error}
            onRetry={() => repositoryObjectQuery.refetch()}
            title={dict.common.errors.failedToLoadObjects}
            description={dict.common.errors.failedToLoadAgain}
            size='sm'
          />
        </div>
      </div>
    );
  }

  if (!rootObject) {
    return (
      <div className='mb-4 w-full overflow-hidden rounded-lg border border-card'>
        <div className='p-8'>
          <div className='flex flex-col items-center justify-center gap-4'>
            <LuSearchX className='size-12 text-gray-400' />
            <div className='text-center'>
              <div
                className={`
                  text-base font-medium text-gray-900
                  dark:text-gray-100
                `}
              >
                {dict.repository.objects.contentUnavailable}
              </div>
              <div
                className={`
                  mt-2 text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {dict.common.tryAgainOrContactSupport}
              </div>
            </div>
            <Button
              variant='outline'
              onClick={() => repositoryObjectQuery.refetch()}
            >
              {dict.common.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='mb-4 w-full overflow-hidden rounded-lg border border-card'>
      {/* Search header */}
      <div
        className={`
          flex items-center justify-start gap-2 rounded-lg border-b
          border-gray-200 bg-background px-4 py-2
          dark:border-gray-800
        `}
      >
        <Input
          placeholder={dict.repository.objects.filterObjects}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='max-w-sm bg-background text-sm'
        />
      </div>

      <div className='max-h-[400px] w-full overflow-scroll bg-background'>
        {filteredAndSorted.length === 0 ? (
          <div
            className={`
              flex size-full min-h-96 flex-col items-center justify-center gap-4
            `}
          >
            <LuSearchX className='size-12 text-gray-400' />
            <div
              className={`
                text-base text-gray-600
                lg:text-lg
                dark:text-gray-300
              `}
            >
              {dict.repository.objects.noObjects}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[400px]'>
                  <Button variant='ghost' onClick={() => handleSort('name')}>
                    {dict.common.name}
                    <TbArrowsSort className='ml-2 size-4' />
                  </Button>
                </TableHead>
                <TableHead className='font-normal'>
                  <Button
                    variant='ghost'
                    onClick={() => handleSort('content_type')}
                  >
                    {dict.repository.objects.contentType}
                    <TbArrowsSort className='ml-2 size-4' />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant='ghost'
                    onClick={() => handleSort('last_modified')}
                  >
                    {dict.common.lastModified}
                    <TbArrowsSort className='ml-2 size-4' />
                  </Button>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map(({ object, depth }) => {
                const isCurrentPath = object.path === currentPath;
                const isExpanded = openFolders[object.path ?? ''] ?? false;
                const hasChildren =
                  object.type === 'group' && (object.children?.length ?? 0) > 0;

                return (
                  <TableRow
                    key={object.path}
                    className={
                      isCurrentPath
                        ? `
                          bg-gray-200
                          dark:bg-gray-800
                        `
                        : ''
                    }
                  >
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <div
                          className='flex items-center space-x-2'
                          style={{ paddingLeft: `${depth * 24}px` }}
                        >
                          {hasChildren && (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='size-5 p-0'
                              onClick={() => toggleFolder(object)}
                            >
                              {isExpanded ? (
                                <TbChevronDown className='size-4' />
                              ) : (
                                <TbChevronRight className='size-4' />
                              )}
                            </Button>
                          )}
                          {!hasChildren && <div className='w-5' />}
                          {getIcon(object.type)}
                          <Button
                            variant='link'
                            className={
                              isCurrentPath
                                ? 'underline'
                                : `
                                  no-underline
                                  hover:underline
                                `
                            }
                            onClick={() => handleObjectClick(object)}
                          >
                            {object.name}
                          </Button>
                          {object.tags && object.tags.length > 0 && (
                            <WorkspaceTagDisplay
                              tags={object.tags}
                              maxVisible={3}
                              size='sm'
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{object.content_type || '-'}</TableCell>
                    <TableCell>
                      {object.last_modified
                        ? new Date(object.last_modified).toLocaleString(locale)
                        : '-'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        className='p-2'
                        onClick={() => handleObjectClick(object)}
                      >
                        <TbDotsVertical className='size-5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default memo(RepositoryFiletree);
