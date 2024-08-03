'use client';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page for the Data Repository settings
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function DataRepositorySettingsPage({
  params,
}: {
  params: { dataRepo: string };
}) {
  const { dict } = useLocale();
  const {
    dataRepositories: { dataRepositories },
  } = useWorkspace();

  const dataRepo = dataRepositories.find(
    (repo) => repo.slug === params.dataRepo
  );

  if (!dataRepo) return <></>;

  const handleUpdateDataRepo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Update data repository
  };

  return (
    <div className='mx-2 md:mx-4'>
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4'>
        <h2 className='mb-4 text-2xl font-normal'>
          {dict.dataRepository.tabs.settings}
        </h2>
        <div className='pb-8'>
          <form onSubmit={handleUpdateDataRepo}>
            <div>
              <label className='mb-2 block text-xs text-gray-700 md:text-sm'>
                {dict.dataRepository.settings.name}
              </label>
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                required
                className='h-11 w-full'
                type='text'
                name='name'
                defaultValue={dataRepo.name}
              />
            </div>
            <Button
              className='mt-4 h-11 w-full'
              type='submit'
              size='sm'
              colorScheme='light'
              variant='solid'
            >
              {dict.dataRepository.settings.saveChanges}
            </Button>
          </form>
          <div className='mt-8'>
            <p className='text-sm font-normal text-red-800 md:text-xl'>
              {dict.dataRepository.settings.dangerZone}
            </p>
            <p className='mt-2 text-xs text-gray-700 md:text-base'>
              {dict.dataRepository.settings.deletionNote}
            </p>
            <Button
              className='mt-4'
              size='sm'
              colorScheme='secondary'
              variant='outline'
            >
              {dict.dataRepository.settings.deleteDataRepository}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
