'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Section UI for selecting tables which should be part of this repository
 *
 * @param repository - The repository to display and edit the settings for
 */
export default function RepositoryTableSettingsSection({
  repository,
}: {
  repository: Repository | undefined;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    repositories: { repositories, updateRepository },
  } = useWorkspace();

  const [newTable, setNewTable] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>(repository?.tables ?? []);

  useEffect(() => {
    if (tables.length === 0) setTables(repository?.tables ?? []);
  }, [repository, tables.length]);

  /**
   * Calculates all available tables for the repository table settings section.
   *
   * @returns An array of unique tables that are not included in the current repository's tables.
   */
  const allAvailableTables = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((repo) => repo.tables)
            .flat()
            .filter((table) => !repository?.tables.includes(table))
        )
      ),
    [repositories, repository]
  );

  const handleUpdateRepository = useCallback(() => {
    try {
      if (!repository) return;
      // Remove duplicate tables
      const uniqueTables = Array.from(new Set(tables));
      if (uniqueTables.length !== tables.length) {
        setTables(uniqueTables);
      }
      // Update repository tables
      if (tables) {
        updateRepository(repository.slug, {
          ...repository,
          tables: uniqueTables,
        });
        irminAlert('success', dict.repository.settings.repositoryUpdated);
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [repository, updateRepository, tables, irminAlert, dict]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='my-8 px-4'>
          <div className='mb-8 flex flex-row items-center justify-between px-2'>
            <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
              {dict.repository.settings.manageTables}
            </h2>
            <Button
              size='sm'
              variant='outline'
              colorScheme='gray'
              href={`/${locale}/portal/${currentWorkspace?.slug ?? ''}/repositories/${repository?.slug ?? ''}/settings`}
            >
              {dict.repository.settings.generalSettings}
            </Button>
          </div>
          {repository?.is_immutable && (
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.repository.immutableDescription}
            </p>
          )}
          {repository && !repository?.is_immutable && (
            <div className='flex flex-col'>
              <span className='px-2 text-xs text-gray-400 dark:text-gray-600'>
                {dict.repository.settings.selectTableToAdd}
              </span>
              <div className='flex w-full flex-row items-center justify-normal gap-2'>
                {/* Form to add more tables to this repository */}
                <div className='w-full'>
                  <ReactSelect
                    value={{ value: newTable, label: newTable }}
                    onChange={(newValue) => {
                      if (!newValue) return;
                      setNewTable(newValue.value);
                    }}
                    options={allAvailableTables.map((table) => ({
                      value: table,
                      label: table,
                    }))}
                    className='react-select-container w-full'
                    classNamePrefix='react-select'
                  />
                </div>
                <Button
                  className='min-w-24'
                  size='sm'
                  colorScheme='primary'
                  variant='solid'
                  onClick={() => {
                    if (newTable) setTables([...tables, newTable]);
                  }}
                >
                  {dict.repository.settings.addTable}
                </Button>
              </div>
              <div className='my-8'>
                {/* List of current tables in the repository */}
                {tables.map((table, idx) => (
                  <div
                    key={`table-${table}-${idx}`}
                    className='flex w-full flex-row items-center justify-between'
                  >
                    <div className='text-xs opacity-80'>{table}</div>
                    <Button
                      size='sm'
                      colorScheme='gray'
                      variant='link'
                      onClick={() => {
                        setTables(tables.filter((t) => t !== table));
                      }}
                    >
                      {dict.repository.settings.remove}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className='h-11 w-full'
                type='submit'
                size='sm'
                colorScheme='light'
                variant='solid'
                onClick={handleUpdateRepository}
              >
                {dict.repository.settings.saveChanges}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
