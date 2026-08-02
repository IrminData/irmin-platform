'use client';

import { memo, useCallback } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Action, Export, Import, Pipeline } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

import type { WorkflowWizardData } from '../types';
import ActionWorkflow from '../workflowable/ActionWorkflow';
import ExportWorkflow from '../workflowable/ExportWorkflow';
import ImportWorkflow from '../workflowable/ImportWorkflow';
import PipelineWorkflow from '../workflowable/PipelineWorkflow';

/**
 * Step component for configuring workflow type specific properties
 */
function ConfigureWorkflowableStep({
  wizardData,
  updateWizardData,
  goNext,
  goBack,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goNext: () => void;
  goBack?: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const validateWorkflowable = useCallback((): boolean => {
    const currentWorkflowable = wizardData.workflowable;
    if (!currentWorkflowable) {
      irminAlert(
        'error',
        dict.workflow.create.validation.workflowableConfigurationMissing
      );
      return false;
    }

    switch (currentWorkflowable.type) {
      case 'import': {
        const importWorkflowable = currentWorkflowable as Import;
        if (!importWorkflowable.connection_id) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectConnection
          );
          return false;
        }
        if (!importWorkflowable.repository) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectDestinationRepository
          );
          return false;
        }
        if (!importWorkflowable.repository_branch) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSpecifyDestinationBranch
          );
          return false;
        }
        if (!importWorkflowable.import_to_repository_path) {
          irminAlert(
            'error',
            dict.workflow.create.validation
              .pleaseSpecifyDestinationPathInRepository
          );
          return false;
        }
        if (
          !importWorkflowable.import_from_connection_paths ||
          importWorkflowable.import_from_connection_paths.length === 0
        ) {
          irminAlert(
            'error',
            dict.workflow.create.validation
              .pleaseAddAtLeastOneSourcePathFromConnection
          );
          return false;
        }
        break;
      }
      case 'export': {
        const exportWorkflowable = currentWorkflowable as Export;
        if (!exportWorkflowable.connection_id) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectConnection
          );
          return false;
        }
        if (!exportWorkflowable.repository) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectSourceRepository
          );
          return false;
        }
        if (!exportWorkflowable.repository_branch) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSpecifySourceBranch
          );
          return false;
        }
        if (!exportWorkflowable.export_to_connection_path) {
          irminAlert(
            'error',
            dict.workflow.create.validation
              .pleaseSpecifyDestinationPathInConnection
          );
          return false;
        }
        if (
          !exportWorkflowable.export_from_repository_paths ||
          exportWorkflowable.export_from_repository_paths.length === 0
        ) {
          irminAlert(
            'error',
            dict.workflow.create.validation
              .pleaseAddAtLeastOneSourcePathFromRepository
          );
          return false;
        }
        break;
      }
      case 'action': {
        const actionWorkflowable = currentWorkflowable as Action;
        const executableType = actionWorkflowable.executable_type || 'script';
        if (executableType === 'script' && !actionWorkflowable.script_id) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectExecutableScript
          );
          return false;
        }
        if (executableType === 'query' && !actionWorkflowable.query_id) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseSelectExecutableQuery
          );
          return false;
        }
        // If results repository is set, branch and path are required
        if (actionWorkflowable.results_repository) {
          if (!actionWorkflowable.results_repository_branch) {
            irminAlert(
              'error',
              dict.workflow.create.validation
                .pleaseSpecifyResultsRepositoryBranch
            );
            return false;
          }
          if (!actionWorkflowable.results_repository_path) {
            irminAlert(
              'error',
              dict.workflow.create.validation.pleaseSpecifyResultsRepositoryPath
            );
            return false;
          }
        }
        break;
      }
      case 'pipeline': {
        const pipelineWorkflowable = currentWorkflowable as Pipeline;
        if (
          !pipelineWorkflowable.stages ||
          pipelineWorkflowable.stages.length === 0
        ) {
          irminAlert(
            'error',
            dict.workflow.create.validation.pleaseAddAtLeastOnePipelineStage
          );
          return false;
        }
        break;
      }
      default:
        break;
    }

    return true;
  }, [wizardData.workflowable, irminAlert, dict]);

  const handleNextStep = useCallback(() => {
    if (validateWorkflowable()) {
      goNext();
    }
  }, [goNext, validateWorkflowable]);

  // Convert WorkflowWizardData to WorkflowRequest format
  const convertToWorkflowRequest = useCallback(
    (wizardData: WorkflowWizardData): WorkflowRequest => ({
      type: wizardData.type || 'action',
      name: wizardData.name,
      description: wizardData.description,
      documentation: wizardData.documentation,
      workflowable: wizardData.workflowable,
      schedule: wizardData.schedule,
    }),
    []
  );

  // Create a setWorkflowData function that updates the wizard data
  const setWorkflowData = useCallback(
    (updater: React.SetStateAction<WorkflowRequest>) => {
      const currentRequest: WorkflowRequest = {
        type: wizardData.type || 'action',
        name: wizardData.name || '',
        description: wizardData.description || '',
        documentation: wizardData.documentation || '',
        workflowable: wizardData.workflowable,
        schedule: wizardData.schedule,
      };

      const newRequest =
        typeof updater === 'function' ? updater(currentRequest) : updater;

      updateWizardData({
        type: newRequest.type,
        name: newRequest.name,
        description: newRequest.description,
        documentation: newRequest.documentation,
        workflowable: newRequest.workflowable,
        schedule: newRequest.schedule,
      });
    },
    [updateWizardData, wizardData]
  );

  const workflowable = wizardData.workflowable;

  // Early return if workflowable is not defined - go back to type selection
  if (!workflowable) {
    return (
      <div className='flex w-full flex-col items-center justify-center px-4 py-12'>
        <p className='mb-4 text-sm text-muted-foreground'>
          {dict.workflow.create.validation.workflowableConfigurationMissing}
        </p>
        {goBack && (
          <Button variant='secondary' onClick={goBack}>
            {dict.workflow.create.goBack}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowable.type === 'action' && (
          <ActionWorkflow
            workflowable={workflowable as Action}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'import' && (
          <ImportWorkflow
            workflowable={workflowable as Import}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'export' && (
          <ExportWorkflow
            workflowable={workflowable as Export}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'pipeline' && (
          <PipelineWorkflow
            workflowable={workflowable as Pipeline}
            workflowData={convertToWorkflowRequest(wizardData)}
            setWorkflowData={setWorkflowData}
          />
        )}
      </div>
      <div className={`mt-auto border-t pt-4`}>
        <Button
          className='mb-6 inline-block w-full'
          variant='accent'
          size={'lg'}
          onClick={handleNextStep}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
        {goBack && (
          <Button
            className='mb-6 inline-block w-full'
            variant='link'
            size='sm'
            onClick={goBack}
          >
            {dict.workflow.create.goBack}
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflowableStep);
