'use client';

import React from 'react';

import { TbChevronLeft, TbHome } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import Input from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

interface ObjectListHeaderProps {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  currentPath: string;
  updateCurrentPath: (path: string) => void;
}

export function ObjectListHeader({
  searchTerm,
  setSearchTerm,
  currentPath,
  updateCurrentPath,
}: ObjectListHeaderProps) {
  const { dict } = useLocale();
  const pathParts = currentPath.split('/').filter(Boolean);

  function navigateUp() {
    const parts = currentPath.split('/');
    parts.pop();
    updateCurrentPath(parts.join('/'));
  }

  function navigateToGroup(path: string) {
    updateCurrentPath(path);
  }

  return (
    <div
      className={`bg-background flex items-center justify-start gap-2 rounded-lg border-b border-gray-200 px-1 py-2 dark:border-gray-800`}
    >
      {currentPath !== '/' && (
        <Button variant='ghost' onClick={navigateUp}>
          <TbChevronLeft className='mr-2 h-4 w-4' />
          {dict.common.back}
        </Button>
      )}
      <div className='flex items-center space-x-2 rounded-md font-mono text-xs'>
        {currentPath !== '/' && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigateToGroup('/')}
          >
            <TbHome className='mr-2 h-4 w-4' />
            {dict.fileNavigator.root}
          </Button>
        )}
        {pathParts.map((part, index) => (
          <React.Fragment key={index}>
            <span className='text-gray-500 dark:text-gray-400'>/</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                navigateToGroup('/' + pathParts.slice(0, index + 1).join('/'))
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
        className='bg-background ml-auto max-w-sm text-sm'
      />
    </div>
  );
}
