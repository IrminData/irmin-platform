'use client';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository settings
 */
export default function RepositorySettingsPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const { dict } = useLocale();
  const {
    repositories: { repositories },
  } = useWorkspace();

  const repository = repositories.find(
    (repo) => repo.slug === params.repository
  );

  if (!repository) return <></>;

  const handleUpdateRepository = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Update repository
  };

  return (
    <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
      <div className='my-8 px-4'>
        <h2 className='mb-8 font-display text-xl font-bold sm:text-2xl lg:text-3xl'>
          {dict.repository.tabs.settings}
        </h2>
        <div className='pb-8'>
          <form onSubmit={handleUpdateRepository}>
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
                defaultValue={repository.name}
              />
            </div>
            <Button
              className='mt-4 h-11 w-full'
              type='submit'
              size='sm'
              colorScheme='light'
              variant='solid'
            >
              {dict.repository.settings.saveChanges}
            </Button>
          </form>
          <div className='mt-8'>
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.repository.settings.dangerZone}
            </p>
            <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
              {dict.repository.settings.deletionNote}
            </p>
            <Button
              className='mt-4 dark:bg-gray-800 dark:text-white'
              size='sm'
              colorScheme='secondary'
              variant='outline'
            >
              {dict.repository.settings.deleteRepository}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
