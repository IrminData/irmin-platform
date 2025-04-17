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
import { useRepository } from '@/context/RepositoryContext';

import { Object } from '@/types/core/Object';

import { ObjectListHeader } from './ObjectListHeader';
import { TableSkeleton } from './TableSkeleton';

/**
 * Table of objects in the repository
 *
 * @param props - The component props
 * @param props.selectObject - The function to call when an object is selected
 */
export default function ObjectList({
  selectObject,
}: {
  selectObject: (object: Object) => void;
}) {
  const { locale, dict } = useLocale();
  const { loadingDirectory, updateCurrentPath, currentPath, directory } =
    useRepository();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'path' | 'type' | 'content_type' | 'last_modified';
    direction: 'ascending' | 'descending';
  }>({ key: 'name', direction: 'ascending' });

  const filteredObjects = useMemo(() => {
    return (
      directory?.children?.filter((obj) =>
        obj.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) ?? []
    );
  }, [directory, searchTerm]);

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
        updateCurrentPath={updateCurrentPath}
      />
      <div className='bg-background max-h-[400px] w-full overflow-scroll'>
        {loadingDirectory ? (
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
                              updateCurrentPath(obj.path);
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

            {!directory?.children && (
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
