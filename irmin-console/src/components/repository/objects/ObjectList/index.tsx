'use client';

import { useCallback, useMemo, useState } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';

import { LuSearchX } from 'react-icons/lu';
import {
  TbArrowDown,
  TbArrowsSort,
  TbArrowUp,
  TbDotsVertical,
  TbFile,
  TbFolder,
  TbLink,
  TbTable,
  TbVectorTriangle,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
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

import { cn } from '@/utils/tw';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { RepositoryObject } from '@/types/core/RepositoryObject';

import ObjectListHeader from './ObjectListHeader';
import ObjectListTableSkeleton from './ObjectListTableSkeleton';

/**
 * Removes a trailing slash (except when the path is just "/").
 *
 * @param path – the path to normalise
 * @returns the path without any trailing slash
 */
const normalizePath = (path: string): string =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

/**
 * Flattens an object and its children into a single array of objects.
 * @param obj - The object to flatten
 * @returns An array of objects, including the original object and all its children
 */
const flattenObjects = (obj: RepositoryObject): RepositoryObject[] => {
  const children = obj.children || [];
  const flattenedChildren = children.flatMap(flattenObjects);
  return [obj, ...flattenedChildren];
};

/**
 * Checks if a repository object is an embedding file.
 * Embedding files are .parquet files with the 'irmin-file-type' metadata set to 'embeddings'.
 *
 * @param obj - The repository object to check
 * @returns Whether the object is an embedding file
 */
const isEmbeddingFile = (obj: RepositoryObject): boolean =>
  obj.path.endsWith('.parquet') &&
  obj.metadata?.['irmin-file-type'] === 'embeddings';

/**
 * Table of objects in the repository
 *
 * @param props - The component props
 * @param props.selectObject - The function to call when an object is selected
 * @param props.selectedObjectPath - Path of the currently selected object, used to highlight its row
 * @param props.currentPath - The current path in the repository
 * @param props.setCurrentPath - The function to set the current path
 * @param props.repositoryObjectQuery - The query result for the repository object
 */
export default function ObjectList({
  selectObject,
  selectedObjectPath,
  currentPath,
  setCurrentPath,
  repositoryObjectQuery,
}: {
  selectObject: (object: RepositoryObject) => void;
  selectedObjectPath?: string;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  repositoryObjectQuery: UseQueryResult<
    IrminAPIResponse<RepositoryObject>,
    Error
  >;
}) {
  const { locale, dict } = useLocale();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'content_type' | 'last_modified' | 'name' | 'path' | 'type';
    direction: 'ascending' | 'descending';
  }>({ key: 'name', direction: 'ascending' });

  const filteredObjects = useMemo(() => {
    if (!repositoryObjectQuery.data?.data) return [];

    const rootObject = repositoryObjectQuery.data?.data;

    // strip any trailing slash off the folder we're in
    const normCurrent = normalizePath(currentPath);

    // unify your search term
    const lowerSearch = searchTerm.toLowerCase();

    // helper to test name/path against search
    const matchesSearch = (obj: RepositoryObject) =>
      obj.name.toLowerCase().includes(lowerSearch) ||
      normalizePath(obj.path).toLowerCase().includes(lowerSearch);

    // at root: just show the direct children of rootObject
    if (normCurrent === '') {
      return (rootObject.children ?? []).filter(matchesSearch);
    }

    // elsewhere: flatten and pull only immediate children
    const flat = flattenObjects(rootObject);
    const itemsInFolder = flat.filter((obj) => {
      const normPath = normalizePath(obj.path);

      // skip the folder itself
      if (normPath === normCurrent) {
        return false;
      }

      // figure out this object's parent folder
      const idx = normPath.lastIndexOf('/');
      const parent = idx > -1 ? normPath.slice(0, idx) : '';

      // keep only if it lives directly under our current folder
      return parent === normCurrent;
    });

    // finally apply search filtering
    return itemsInFolder.filter(matchesSearch);
  }, [repositoryObjectQuery.data?.data, currentPath, searchTerm]);

  const sortedObjects = useMemo(() => {
    const sortableObjects = [...filteredObjects];
    sortableObjects.sort((a, b) => {
      if ((a[sortConfig.key] ?? '') < (b[sortConfig.key] ?? '')) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if ((a[sortConfig.key] ?? '') > (b[sortConfig.key] ?? '')) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return sortableObjects;
  }, [filteredObjects, sortConfig]);

  const handleSort = useCallback(
    (key: 'content_type' | 'last_modified' | 'name' | 'path' | 'type') => {
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

  const getTypeIcon = useCallback((obj: RepositoryObject) => {
    // Check for embedding files first
    if (isEmbeddingFile(obj)) {
      return (
        <TbVectorTriangle
          className={`
            size-5 text-purple-500
            dark:text-purple-400
          `}
        />
      );
    }

    switch (obj.type) {
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
      default:
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

  const getIcon = useCallback(
    (obj: RepositoryObject) => {
      const typeIcon = getTypeIcon(obj);

      // If it's a pointer, show both the type icon and a small pointer indicator
      if (obj.is_pointer) {
        return (
          <div className='relative'>
            {typeIcon}
            <TbLink
              className={`
                absolute -right-1 -bottom-1 size-3 rounded-full bg-background
                text-cyan-500
                dark:text-cyan-400
              `}
            />
          </div>
        );
      }

      return typeIcon;
    },
    [getTypeIcon]
  );

  return (
    <div className='mb-4 w-full overflow-hidden rounded-lg border border-card'>
      <ObjectListHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentPath={currentPath}
        setCurrentPath={setCurrentPath}
      />
      <div className='max-h-[400px] w-full overflow-scroll bg-background'>
        {repositoryObjectQuery.isLoading ? (
          <ObjectListTableSkeleton />
        ) : repositoryObjectQuery.error ? (
          <div className='p-8'>
            <QueryError
              error={repositoryObjectQuery.error}
              onRetry={() => repositoryObjectQuery.refetch()}
              title={dict.common.errors.failedToLoadObjects}
              description={dict.common.errors.failedToLoadAgain}
              size='sm'
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[300px]'>
                    <SortHeaderButton
                      label={dict.common.name}
                      sortKey='name'
                      activeKey={sortConfig.key}
                      direction={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className='font-normal'>
                    <SortHeaderButton
                      label={dict.repository.objects.contentType}
                      sortKey='content_type'
                      activeKey={sortConfig.key}
                      direction={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeaderButton
                      label={dict.common.lastModified}
                      sortKey='last_modified'
                      activeKey={sortConfig.key}
                      direction={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedObjects.map((obj) => (
                  <TableRow
                    key={obj.path}
                    className='content-visibility-auto-lg'
                  >
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center space-x-2'>
                          {getIcon(obj)}
                          <Button
                            variant='link'
                            className={cn(
                              `
                                no-underline decoration-1
                                hover:underline hover:decoration-1
                              `,
                              obj.type !== 'group' &&
                                obj.path === selectedObjectPath &&
                                `
                                  underline decoration-2
                                  hover:decoration-2
                                `
                            )}
                            onClick={() => {
                              if (obj.type === 'group') {
                                setCurrentPath(obj.path);
                              } else {
                                selectObject(obj);
                              }
                            }}
                          >
                            {obj.name}
                          </Button>
                          {/* Display Vectors badge for embedding files */}
                          {isEmbeddingFile(obj) && (
                            <Badge
                              variant='secondary'
                              className={`
                                bg-purple-100 text-purple-700
                                dark:bg-purple-900/30 dark:text-purple-300
                              `}
                            >
                              {dict.repository.objects.vectors}
                            </Badge>
                          )}
                          {/* Display Pointer badge for pointer files */}
                          {obj.is_pointer && (
                            <Badge
                              variant='secondary'
                              className={`
                                bg-cyan-100 text-cyan-700
                                dark:bg-cyan-900/30 dark:text-cyan-300
                              `}
                              title={
                                obj.pointer_target
                                  ? `${dict.repository.objects.pointsTo}: ${obj.pointer_target.target_repository}/${obj.pointer_target.target_path}@${obj.pointer_target.target_ref}`
                                  : dict.repository.objects.pointer
                              }
                            >
                              {dict.repository.objects.pointer}
                            </Badge>
                          )}
                          {/* Display tags if they exist */}
                          {obj.tags && obj.tags.length > 0 && (
                            <WorkspaceTagDisplay
                              tags={obj.tags}
                              maxVisible={3}
                              size='sm'
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{obj.content_type || '-'}</TableCell>
                    <TableCell>
                      {obj.last_modified
                        ? new Date(obj.last_modified).toLocaleString(locale)
                        : '-'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        className='p-2'
                        onClick={() => {
                          selectObject(obj);
                        }}
                      >
                        <TbDotsVertical className='size-5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!repositoryObjectQuery.data?.data?.children && (
              <div
                className={`
                  flex size-full min-h-96 flex-col items-center justify-center
                  gap-4
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
                <div
                  className={`
                    text-sm text-gray-500
                    dark:text-gray-400
                  `}
                >
                  {dict.repository.objects.noObjectsMessage}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type SortKey = 'content_type' | 'last_modified' | 'name' | 'path' | 'type';

/**
 * Column-header sort button. Text-only mono label, directional chevron.
 * Previously wrapped the header in a full-height Button which read as
 * an input pill; this renders as a quiet sortable label with active
 * state signaled by a filled chevron instead of a bordered container.
 */
function SortHeaderButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: 'ascending' | 'descending';
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  const Chevron = !isActive
    ? TbArrowsSort
    : direction === 'ascending'
      ? TbArrowUp
      : TbArrowDown;
  return (
    <button
      type='button'
      onClick={() => onSort(sortKey)}
      className={`
        inline-flex cursor-pointer items-center gap-1.5 bg-transparent
        text-[11px] font-medium tracking-[0.08em] text-muted-foreground
        uppercase transition-colors duration-150
        hover:text-foreground
        focus-visible:outline-1 focus-visible:outline-offset-1
        focus-visible:outline-accent/70
        data-[active=true]:text-foreground
      `}
      data-active={isActive}
      aria-label={
        isActive ? `${label}, sorted ${direction}` : `${label}, not sorted`
      }
    >
      {label}
      <Chevron className='size-3 shrink-0 opacity-70' aria-hidden='true' />
    </button>
  );
}
