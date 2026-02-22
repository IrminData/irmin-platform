'use client';

import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type { ConnectionFieldValues } from '@/types/core/Connection';

import type { DataImportWizardData } from '../types';

/**
 * Step 5: Review and Create
 *
 * Users review their configuration and create the connection, repository, and workflow
 */
export default function ReviewAndCreateStep({
  wizardData,
  goBack,
  closeModal,
}: {
  wizardData: DataImportWizardData;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const { createConnectionMutation } = useConnections();
  const { createRepositoryMutation } = useRepositories();
  const { createWorkflowMutation } = useWorkflows('import');

  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({
    connection: false,
    repository: false,
    workflow: false,
  });

  const handleCreate = useCallback(async () => {
    setIsCreating(true);

    try {
      let connectionId = '';
      let repositorySlug = '';

      // Step 1: Create connection if needed
      if (wizardData.createNewConnection) {
        setCreationProgress((prev) => ({ ...prev, connection: true }));

        const connectionResult = await createConnectionMutation.mutateAsync({
          name: wizardData.connectionData.name,
          description: wizardData.connectionData.description,
          documentation: '',
          details: wizardData.connectionData.connectionDetails
            ? convertToConnectionFieldValues(
                wizardData.connectionData.connectionDetails
              )
            : ({} as ConnectionFieldValues),
          settings: wizardData.connectionData.connectionSettings
            ? convertToConnectionFieldValues(
                wizardData.connectionData.connectionSettings
              )
            : ({} as ConnectionFieldValues),
          connectorID: wizardData.connectionData.connector?.id || '',
        });

        connectionId = connectionResult.data?.id || '';
        setCreationProgress((prev) => ({ ...prev, connection: false }));
      } else {
        connectionId = wizardData.connection?.id || '';
      }

      // Step 2: Create repository if needed
      if (wizardData.createNewRepository) {
        setCreationProgress((prev) => ({ ...prev, repository: true }));

        const repositoryResult = await createRepositoryMutation.mutateAsync({
          name: wizardData.repositoryData.name,
          description: wizardData.repositoryData.description,
          documentation: '',
          default_branch: wizardData.repositoryData.default_branch,
          isImmutable: false,
        });

        repositorySlug = repositoryResult.data?.slug || '';
        setCreationProgress((prev) => ({ ...prev, repository: false }));
      } else {
        repositorySlug = wizardData.repository?.slug || '';
      }

      // Step 3: Create workflow
      setCreationProgress((prev) => ({ ...prev, workflow: true }));

      await createWorkflowMutation.mutateAsync({
        name: wizardData.workflowData.name,
        description: wizardData.workflowData.description,
        documentation: wizardData.workflowData.documentation,
        schedule: wizardData.workflowData.schedule,
        type: 'import',
        workflowable: {
          type: 'import',
          connection_id: connectionId,
          import_from_connection_paths:
            wizardData.workflowData.import_from_connection_paths,
          repository: repositorySlug,
          repository_branch: wizardData.workflowData.repository_branch,
          import_to_repository_path:
            wizardData.workflowData.import_to_repository_path,
          field_mappings: wizardData.workflowData.field_mappings,
          sync_mode: wizardData.workflowData.sync_mode,
        },
      });

      setCreationProgress((prev) => ({ ...prev, workflow: false }));

      irminAlert('success', dict.wizard.dataImportSetupCompleted);
      closeModal();
    } catch (error) {
      console.error('Setup wizard error:', error);
      irminAlert('error', dict.wizard.failedToCompleteSetup);
      setIsCreating(false);
      setCreationProgress({
        connection: false,
        repository: false,
        workflow: false,
      });
    }
  }, [
    wizardData,
    createConnectionMutation,
    createRepositoryMutation,
    createWorkflowMutation,
    irminAlert,
    closeModal,
    dict,
  ]);

  const isAnyCreating = Object.values(creationProgress).some(Boolean);

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.reviewYourSetup}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.reviewConfigurationDescription}
          </p>
        </div>
      </div>

      {/* Connection Summary */}
      <div className='space-y-3'>
        <h4 className='flex items-center gap-2 font-medium'>
          {dict.connections.connection}
          {creationProgress.connection && (
            <Badge variant='secondary'>{dict.policy.creating}</Badge>
          )}
        </h4>
        <div
          className={`
            rounded-lg border border-gray-200 p-4
            dark:border-gray-700
          `}
        >
          {wizardData.createNewConnection ? (
            <div>
              <div className='font-medium'>
                {wizardData.connectionData.name}
              </div>
              <div
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.connectionData.description}
              </div>
              <div
                className={`
                  mt-1 text-xs text-gray-500
                  dark:text-gray-500
                `}
              >
                {dict.wizard.connector}{' '}
                {wizardData.connectionData.connector?.name}
              </div>
            </div>
          ) : (
            <div>
              <div className='font-medium'>{wizardData.connection?.name}</div>
              <div
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.connection?.description}
              </div>
              <div
                className={`
                  mt-1 text-xs text-gray-500
                  dark:text-gray-500
                `}
              >
                {dict.wizard.connector} {wizardData.connection?.connector.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repository Summary */}
      <div className='space-y-3'>
        <h4 className='flex items-center gap-2 font-medium'>
          {dict.repository.repository}
          {creationProgress.repository && (
            <Badge variant='secondary'>{dict.policy.creating}</Badge>
          )}
        </h4>
        <div
          className={`
            rounded-lg border border-gray-200 p-4
            dark:border-gray-700
          `}
        >
          {wizardData.createNewRepository ? (
            <div>
              <div className='font-medium'>
                {wizardData.repositoryData.name}
              </div>
              <div
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.repositoryData.description}
              </div>
              <div
                className={`
                  mt-1 text-xs text-gray-500
                  dark:text-gray-500
                `}
              >
                {dict.wizard.defaultBranch}{' '}
                {wizardData.repositoryData.default_branch}
              </div>
            </div>
          ) : (
            <div>
              <div className='font-medium'>{wizardData.repository?.name}</div>
              <div
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.repository?.description}
              </div>
              <div
                className={`
                  mt-1 text-xs text-gray-500
                  dark:text-gray-500
                `}
              >
                {dict.wizard.defaultBranch}{' '}
                {wizardData.repository?.default_branch}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Summary */}
      <div className='space-y-3'>
        <h4 className='flex items-center gap-2 font-medium'>
          {dict.workflow.importWorkflows}
          {creationProgress.workflow && (
            <Badge variant='secondary'>{dict.policy.creating}</Badge>
          )}
        </h4>
        <div
          className={`
            rounded-lg border border-gray-200 p-4
            dark:border-gray-700
          `}
        >
          <div className='font-medium'>{wizardData.workflowData.name}</div>
          <div
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {wizardData.workflowData.description}
          </div>
          <div
            className={`
              mt-2 space-y-1 text-xs text-gray-500
              dark:text-gray-500
            `}
          >
            <div>
              {dict.wizard.importPaths}{' '}
              {wizardData.workflowData.import_from_connection_paths.join(', ')}
            </div>
            <div>
              {dict.wizard.destination}{' '}
              {wizardData.workflowData.import_to_repository_path}
            </div>
            <div>
              {dict.wizard.branch} {wizardData.workflowData.repository_branch}
            </div>
            {wizardData.workflowData.field_mappings.length > 0 && (
              <div>
                {dict.schemaFieldMapper.fieldMappings}:{' '}
                {wizardData.workflowData.field_mappings.length}
              </div>
            )}
            {wizardData.workflowData.schedule && (
              <div>
                {dict.workflow.schedule.workflowSchedule}:{' '}
                {wizardData.workflowData.schedule.triggers?.length ?? 0}{' '}
                {dict.workflow.schedule.trigger}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field Mappings Summary */}
      {wizardData.workflowData.field_mappings.length > 0 && (
        <div className='space-y-3'>
          <h4 className='flex items-center gap-2 font-medium'>
            {dict.schemaFieldMapper.fieldMappings}
          </h4>
          <div
            className={`
              rounded-lg border border-gray-200 p-4
              dark:border-gray-700
            `}
          >
            <div className='space-y-2'>
              {wizardData.workflowData.field_mappings.map((mapping, index) => (
                <div
                  key={`${mapping.source_path}-${mapping.destination_path}-${index}`}
                  className={`
                    flex items-center justify-between rounded-lg border
                    border-gray-100 p-3
                    dark:border-gray-600
                  `}
                >
                  <div className='flex items-center gap-3'>
                    <span
                      className={`
                        rounded-sm bg-irmin-blue-100 px-2 py-1 text-xs
                        font-medium text-irmin-blue-700
                      `}
                    >
                      {mapping.source_field}
                    </span>
                    <span className='text-xs text-gray-500'>→</span>
                    <span
                      className={`
                        rounded-sm bg-irmin-green-100 px-2 py-1 text-xs
                        font-medium text-irmin-green-700
                      `}
                    >
                      {mapping.destination_field}
                    </span>
                  </div>
                  <div className='text-xs text-gray-500'>
                    {mapping.source_path} → {mapping.destination_path}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Creation Progress */}
      {isAnyCreating && (
        <div
          className={`
            rounded-lg bg-blue-50 p-4
            dark:bg-blue-900/20
          `}
        >
          <div
            className={`
              mb-2 text-sm font-medium text-blue-900
              dark:text-blue-100
            `}
          >
            {dict.wizard.settingUpDataImport}
          </div>
          <div
            className={`
              space-y-2 text-xs text-blue-700
              dark:text-blue-300
            `}
          >
            {creationProgress.connection && (
              <div>• {dict.wizard.creatingConnection}</div>
            )}
            {creationProgress.repository && (
              <div>• {dict.wizard.creatingRepository}</div>
            )}
            {creationProgress.workflow && (
              <div>• {dict.wizard.creatingImportWorkflow}</div>
            )}
          </div>
        </div>
      )}

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
          disabled={isCreating}
          size='lg'
        >
          {dict.common.back}
        </Button>
        <Button
          className='flex-1'
          size='lg'
          variant='gradient'
          onClick={handleCreate}
          loading={isCreating}
          disabled={isCreating}
        >
          {isCreating
            ? dict.policy.creating
            : dict.workflow.create.createNewImportWorkflow}
        </Button>
      </div>
    </div>
  );
}
