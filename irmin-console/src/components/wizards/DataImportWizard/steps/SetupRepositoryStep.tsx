'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RepositoryWizard } from '@/components/wizards/RepositoryWizard';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useRepositories } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Repository } from '@/types/core/Repository';

import type { DataImportWizardData } from '../types';

/**
 * Step 2: Setup Repository
 *
 * Users can either select an existing repository or create a new one
 */
export default function SetupRepositoryStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: DataImportWizardData;
  updateWizardData: (updates: Partial<DataImportWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { repositoriesQuery } = useRepositories();
  const { isResourceAllowed } = useResourceAllowed();

  // Filter repositories based on search
  const [searchQuery, setSearchQuery] = useState('');

  // Compute filtered repositories using useMemo
  const filteredRepositories = useMemo(() => {
    const repositories = repositoriesQuery.data?.data;
    if (!repositories) return [];
    return repositories.filter((repository) =>
      repository.name
        .trim()
        .replace(/\s+/g, '')
        .toLowerCase()
        .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
    );
  }, [repositoriesQuery.data?.data, searchQuery]);

  // Repository wizard step state
  const [repositoryWizardStep, setRepositoryWizardStep] = useState(1);

  const handleRepositoryComplete = useCallback(
    (repository: Repository) => {
      updateWizardData({
        repository,
        createNewRepository: false,
        repositoryData: {
          name: repository.name,
          description: repository.description,
          default_branch: repository.default_branch,
        },
      });
      setRepositoryWizardStep(1);
      goNext();
    },
    [updateWizardData, goNext]
  );

  const handleContinue = useCallback(() => {
    if (!wizardData.repository) {
      irminAlert('error', dict.wizard.pleaseSelectRepository);
      return;
    }
    goNext();
  }, [wizardData.repository, goNext, irminAlert, dict]);

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.setupRepository}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.setupRepositoryDescription}
          </p>
        </div>

        <RadioGroup
          value={wizardData.createNewRepository ? 'new' : 'existing'}
          onValueChange={(value) => {
            // Prevent selecting 'new' if user doesn't have permission
            if (value === 'new' && !isResourceAllowed('repository', 'create')) {
              return;
            }
            updateWizardData({
              createNewRepository: value === 'new',
              repository: value === 'existing' ? wizardData.repository : null,
            });
          }}
          className='space-y-4'
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='existing' id='existing' />
            <Label htmlFor='existing' className='flex-1'>
              <div className='flex flex-col'>
                <span className='font-medium'>
                  {dict.wizard.useExistingRepository}
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {dict.wizard.selectFromExistingRepositories}
                </span>
              </div>
            </Label>
          </div>
          <div
            className={
              'flex items-center space-x-2' +
              (!isResourceAllowed('repository', 'create') ? 'opacity-50' : '')
            }
          >
            <RadioGroupItem
              value='new'
              id='new'
              disabled={!isResourceAllowed('repository', 'create')}
            />
            <Label htmlFor='new' className='flex-1'>
              <div className='flex flex-col'>
                <span className='font-medium'>
                  {dict.repository.createNewRepository}
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {!isResourceAllowed('repository', 'create')
                    ? dict.common.insufficientPermissions
                    : dict.wizard.createNewRepositoryDescription}
                </span>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {!wizardData.createNewRepository ? (
        // Existing repositories selection
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
                          dark:border-gray-700
                          dark:hover:border-gray-600
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
      ) : (
        // Embedded repository wizard
        <div className='space-y-4'>
          <RepositoryWizard
            closeModal={() => {}}
            currentStep={repositoryWizardStep}
            setCurrentStep={setRepositoryWizardStep}
            embedded={true}
            onComplete={handleRepositoryComplete}
            onCancel={() => {
              setRepositoryWizardStep(1);
              updateWizardData({ createNewRepository: false });
            }}
          />
        </div>
      )}

      {!wizardData.createNewRepository && (
        <div
          className={`
            flex gap-3 border-t pt-4
            dark:border-gray-800
          `}
        >
          <Button
            variant='secondary'
            onClick={goBack}
            className='flex-1'
            size='lg'
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
      )}
    </div>
  );
}
