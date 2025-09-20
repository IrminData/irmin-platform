'use client';

import { useCallback, useEffect, useState } from 'react';

import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useRepositories } from '@/hooks/api';

import type { Repository } from '@/types/core/Repository';

import type { DataExportWizardData } from '../types';

/**
 * Step 2: Select Repository
 *
 * Users can only select from existing repositories (no creation option for exports)
 */
export default function SelectRepositoryStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: DataExportWizardData;
  updateWizardData: (updates: Partial<DataExportWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { repositoriesQuery } = useRepositories();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRepositories, setFilteredRepositories] = useState<
    Repository[]
  >([]);

  useEffect(() => {
    if (repositoriesQuery.data?.data) {
      const filtered = repositoriesQuery.data.data.filter((repository) =>
        repository.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
      );
      setFilteredRepositories(filtered);
    }
  }, [repositoriesQuery.data?.data, searchQuery]);

  const handleContinue = useCallback(() => {
    if (!wizardData.repository) {
      irminAlert('error', dict.wizard.pleaseSelectRepository);
      return;
    }
    goNext();
  }, [wizardData.repository, irminAlert, goNext, dict]);

  if (repositoriesQuery.isLoading) {
    return (
      <div className='flex w-full flex-col space-y-6 px-4 py-8'>
        <div className='animate-pulse space-y-4'>
          <div
            className={`
              h-4 w-1/3 rounded bg-gray-200
              dark:bg-gray-700
            `}
          />
          <div
            className={`
              h-3 w-2/3 rounded bg-gray-200
              dark:bg-gray-700
            `}
          />
          <div
            className={`
              h-10 w-full rounded bg-gray-200
              dark:bg-gray-700
            `}
          />
          <div className='space-y-2'>
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={`skeleton-${i}`}
                className={`
                  h-16 w-full rounded bg-gray-200
                  dark:bg-gray-700
                `}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.selectSourceRepository}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.selectSourceRepositoryDescription}
          </p>
        </div>
      </div>

      <div className='space-y-4'>
        <div>
          <h4 className='mb-2 font-medium'>{dict.wizard.selectRepository}</h4>
          <Input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={dict.wizard.searchRepositories}
            icon={<TbSearch />}
          />
        </div>

        <div className='max-h-64 space-y-2 overflow-y-auto'>
          {filteredRepositories.length === 0 ? (
            <p className='py-4 text-center text-sm text-gray-500'>
              {searchQuery
                ? dict.wizard.noRepositoriesFound
                : dict.wizard.noRepositoriesAvailable}
            </p>
          ) : (
            filteredRepositories.map((repository) => (
              <button
                key={repository.id}
                type='button'
                className={`
                  w-full rounded-lg border p-3 text-left transition-colors
                  ${
                    wizardData.repository?.id === repository.id
                      ? `bg-card`
                      : `
                        border-gray-200
                        hover:border-gray-300
                        dark:border-gray-700 dark:hover:border-gray-600
                      `
                  }
                `}
                onClick={() => updateWizardData({ repository })}
              >
                <div className='flex items-center gap-3'>
                  <div className='flex-1'>
                    <div className='font-medium'>{repository.name}</div>
                    <div
                      className={`
                        text-sm text-gray-600
                        dark:text-gray-400
                      `}
                    >
                      {repository.description || dict.wizard.noDescription}
                    </div>
                    <div
                      className={`
                        text-xs text-gray-500
                        dark:text-gray-500
                      `}
                    >
                      {dict.wizard.defaultBranch} {repository.default_branch}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className={`
          border-t pt-4
          dark:border-gray-800
        `}
      >
        <div className='flex gap-3'>
          <Button
            className='flex-1'
            size='lg'
            variant='secondary'
            onClick={goBack}
          >
            {dict.common.back}
          </Button>
          <Button
            className='flex-1'
            size='lg'
            variant='default'
            onClick={handleContinue}
            disabled={!wizardData.repository}
          >
            {dict.common.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
