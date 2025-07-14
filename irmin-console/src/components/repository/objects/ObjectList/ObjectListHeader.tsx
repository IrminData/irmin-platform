'use client';

import React, { memo, useCallback, useMemo } from 'react';

import { TbChevronLeft, TbHome } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

interface ObjectListHeaderProps {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

function ObjectListHeader({
  searchTerm,
  setSearchTerm,
  currentPath,
  setCurrentPath,
}: ObjectListHeaderProps) {
  const { dict } = useLocale();
  const pathParts = useMemo(
    () => currentPath.split('/').filter(Boolean),
    [currentPath]
  );

  const navigateUp = useCallback(() => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  }, [currentPath, setCurrentPath]);

  const navigateToGroup = useCallback(
    (path: string) => {
      setCurrentPath(path);
    },
    [setCurrentPath]
  );

  return (
    <div
      className={`
        flex items-center justify-start gap-2 rounded-lg border-b
        border-gray-200 bg-background px-1 py-2
        dark:border-gray-800
      `}
    >
      {currentPath !== '' && (
        <Button variant='ghost' onClick={navigateUp}>
          <TbChevronLeft className='mr-2 size-4' />
          {dict.common.back}
        </Button>
      )}
      <div className='flex items-center space-x-2 rounded-md font-mono text-xs'>
        {currentPath !== '' && (
          <Button variant='ghost' size='sm' onClick={() => navigateToGroup('')}>
            <TbHome className='mr-2 size-4' />
            {dict.fileNavigator.root}
          </Button>
        )}
        {pathParts.map((part, index) => (
          <React.Fragment key={part}>
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              /
            </span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                navigateToGroup(pathParts.slice(0, index + 1).join('/'))
              }
              className='p-1'
            >
              {part}
            </Button>
          </React.Fragment>
        ))}
      </div>
      <Input
        placeholder={dict.repository.objects.filterObjects}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='ml-auto max-w-sm bg-background text-sm'
      />
    </div>
  );
}

export default memo(ObjectListHeader);
