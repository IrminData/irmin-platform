'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import ReactSelect from 'react-select';

import { IoChevronBack } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Section to create a new repository.
 */
export default function RepositoryCreateSection() {
  const router = useRouter();
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [nameField, setNameField] = useState('');
  const [descriptionField, setDescriptionField] = useState('');

  const {
    repositories: { repositories, createRepository },
  } = useWorkspace();

  const [newTable, setNewTable] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);

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
            .filter((table) => !tables.includes(table))
        )
      ),
    [repositories, tables]
  );

  /**
   * Creates a new repository with the details provided
   * Uses {@link createNewRepository} to create the repository
   * Shows {@link irminAlert} on success or error
   */
  const handleCreateRepository = useCallback(async () => {
    try {
      const name = nameField.trim();
      const description = descriptionField.trim();
      // Remove duplicate tables
      const uniqueTables = Array.from(new Set(tables));
      if (uniqueTables.length !== tables.length) {
        setTables(uniqueTables);
      }
      // Check if all required fields are filled
      if (
        name &&
        description &&
        uniqueTables &&
        name.length > 0 &&
        uniqueTables.length > 0
      ) {
        await createRepository({
          name: name,
          description: description,
          tables: tables,
          documentation: '',
        } as Repository);
        irminAlert('success', dict.repository.repositoryCreated);
        router.push('../repositories');
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [
    nameField,
    descriptionField,
    tables,
    irminAlert,
    createRepository,
    router,
    dict,
  ]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='mt-8 w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-row items-center gap-2'>
            <Button
              size='sm'
              variant='icon'
              colorScheme='black'
              className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
              href={`../repositories`}
            >
              <IoChevronBack size={24} />
            </Button>
            <PortalTitle title={dict.repository.createNewRepository} />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.repository.settings.name}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              name='name'
              defaultValue={nameField}
              onChange={(e) => setNameField(e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.repository.settings.description}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='w-full'
              type='text'
              name='name'
              defaultValue={descriptionField}
              onChange={(e) => setDescriptionField(e.target.value)}
              longtext={{
                rows: 3,
              }}
            />
          </div>
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
              colorScheme='gray'
              variant='solid'
              onClick={() => {
                if (newTable) setTables([...tables, newTable]);
              }}
            >
              {dict.repository.settings.addTable}
            </Button>
          </div>
          <div>
            {/* List of current tables in the repository */}
            {tables.map((table, idx) => (
              <div
                key={`table-${table}-${idx}`}
                className='mx-2 flex w-full flex-row items-center justify-between'
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
            colorScheme='primary'
            variant='solid'
            onClick={handleCreateRepository}
          >
            {dict.repository.createNewRepository}
          </Button>
        </div>
      </div>
    </div>
  );
}
