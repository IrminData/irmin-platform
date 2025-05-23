'use client';

import { useCallback, useMemo, useState } from 'react';

import { LuSearchX } from 'react-icons/lu';
import {
  TbArrowsSort,
  TbDotsVertical,
  TbFile,
  TbFolder,
  TbTable,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryObject } from '@/hooks/useRepositoryObject';

import { Object } from '@/types/core/Object';

import ObjectListHeader from './ObjectListHeader';
import TableSkeleton from './TableSkeleton';

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
const flattenObjects = (obj: Object): Object[] => {
  const children = obj.children || [];
  const flattenedChildren = children.flatMap(flattenObjects);
  return [obj, ...flattenedChildren];
};

/**
 * Table of objects in the repository
 *
 * @param props - The component props
 * @param props.selectObject - The function to call when an object is selected
 * @param props.currentPath - The current path in the repository
 * @param props.setCurrentPath - The function to set the current path
 */
export default function ObjectList({
  selectObject,
  currentPath,
  setCurrentPath,
}: {
  selectObject: (object: Object) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}) {
  const { locale, dict } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { repositoryObjectQuery } = useRepositoryObject(
    repository.slug,
    currentRef,
    currentPath
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'path' | 'type' | 'content_type' | 'last_modified';
    direction: 'ascending' | 'descending';
  }>({ key: 'name', direction: 'ascending' });

  const filteredObjects = useMemo(() => {
    if (!repositoryObjectQuery.data?.data) return [];

    const rootObject = repositoryObjectQuery.data?.data;

    // strip any trailing slash off the folder we’re in
    const normCurrent = normalizePath(currentPath);

    // unify your search term
    const lowerSearch = searchTerm.toLowerCase();

    // helper to test name/path against search
    const matchesSearch = (obj: Object) =>
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
    (key: 'name' | 'path' | 'type' | 'content_type' | 'last_modified') => {
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

  const getIcon = useCallback((type: Object['type']) => {
    switch (type) {
      case 'group':
        return (
          <TbFolder className='h-5 w-5 text-yellow-500 dark:text-yellow-400' />
        );
      case 'structured':
        return <TbTable className='h-5 w-5 text-blue-500 dark:text-blue-400' />;
      case 'binary':
        return <TbFile className='h-5 w-5 text-gray-500 dark:text-gray-400' />;
    }
  }, []);

  return (
    <div className='border-card mb-4 w-full overflow-hidden rounded-lg border'>
      <ObjectListHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentPath={currentPath}
        setCurrentPath={setCurrentPath}
      />
      <div className='bg-background max-h-[400px] w-full overflow-scroll'>
        {repositoryObjectQuery.isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[300px]'>
                    <Button variant='ghost' onClick={() => handleSort('name')}>
                      {dict.common.name}
                      <TbArrowsSort className='ml-2 h-4 w-4' />
                    </Button>
                  </TableHead>
                  <TableHead className='font-normal'>
                    <Button
                      variant='ghost'
                      onClick={() => handleSort('content_type')}
                    >
                      {dict.repository.objects.contentType}
                      <TbArrowsSort className='ml-2 h-4 w-4' />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant='ghost'
                      onClick={() => handleSort('last_modified')}
                    >
                      {dict.common.lastModified}
                      <TbArrowsSort className='ml-2 h-4 w-4' />
                    </Button>
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedObjects.map((obj) => (
                  <TableRow key={obj.path}>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        {getIcon(obj.type)}
                        <Button
                          variant='link'
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
                        <TbDotsVertical className='h-5 w-5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!repositoryObjectQuery.data?.data?.children && (
              <div className='flex h-full min-h-96 w-full flex-col items-center justify-center gap-4'>
                <LuSearchX className='h-12 w-12 text-gray-400' />
                <div className='text-base text-gray-600 lg:text-lg dark:text-gray-300'>
                  {dict.repository.objects.noObjects}
                </div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>
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
