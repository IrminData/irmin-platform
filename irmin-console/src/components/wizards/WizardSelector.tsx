'use client';

import { useCallback, useState } from 'react';

import {
  IoArrowDownCircle,
  IoArrowUpCircle,
  IoGitBranch,
  IoLink,
  IoPlay,
} from 'react-icons/io5';
import { RiFlowChart } from 'react-icons/ri';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import ConnectionWizardModal from './ConnectionWizardModal';
import DataExportWizardModal from './DataExportWizardModal';
import DataImportWizardModal from './DataImportWizardModal';
import RepositoryWizardModal from './RepositoryWizardModal';
import WizardButton from './WizardButton';
import WorkflowWizardModal from './WorkflowWizardModal';

type WizardType =
  | 'data-import'
  | 'data-export'
  | 'repository'
  | 'connection'
  | 'workflow'
  | 'pipeline';

interface WizardSelectorProps {
  /** Array of wizard types to display. If not specified, all available wizards will be shown */
  availableWizards?: WizardType[];
}

/**
 * Wizard selector component that displays available wizards as buttons
 *
 * @param props0 - WizardSelector props
 * @param props0.availableWizards - Array of wizard types to display. If not specified, all available wizards will be shown
 */
export default function WizardSelector({
  availableWizards,
}: WizardSelectorProps) {
  const { isResourceAllowed } = useResourceAllowed();
  const { dict } = useLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWizard, setSelectedWizard] = useState<string | null>(null);

  // Define all possible wizard types
  const allWizardTypes: WizardType[] = [
    'data-import',
    'data-export',
    'repository',
    'connection',
    'workflow',
    'pipeline',
  ];

  // Use provided availableWizards or default to all wizards
  const enabledWizards = availableWizards || allWizardTypes;

  // Helper function to check if a wizard should be displayed
  const shouldShowWizard = useCallback(
    (wizardType: WizardType) => {
      return enabledWizards.includes(wizardType);
    },
    [enabledWizards]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedWizard(null);
  }, []);

  const openWizard = useCallback((wizardType: string) => {
    setSelectedWizard(wizardType);
    setIsModalOpen(true);
  }, []);

  return (
    <div className='contents'>
      {/* Data Import Wizard */}
      {shouldShowWizard('data-import') &&
        isResourceAllowed('workflow', 'create') && (
          <WizardButton
            onClick={() => openWizard('data-import')}
            icon={<IoArrowDownCircle className='text-xl' />}
            title={dict.wizard.dataImport}
            description={dict.wizard.dataImportDescription}
          />
        )}

      {/* Data Export Wizard */}
      {shouldShowWizard('data-export') &&
        isResourceAllowed('workflow', 'create') && (
          <WizardButton
            onClick={() => openWizard('data-export')}
            icon={<IoArrowUpCircle className='text-xl' />}
            title={dict.wizard.dataExport}
            description={dict.wizard.dataExportDescription}
          />
        )}

      {/* Repository Wizard */}
      {shouldShowWizard('repository') &&
        isResourceAllowed('repository', 'create') && (
          <WizardButton
            onClick={() => openWizard('repository')}
            icon={<IoGitBranch className='text-xl' />}
            title={dict.repository.createNewRepository}
            description={dict.wizard.repositoryDescription}
          />
        )}

      {/* Connection Wizard */}
      {shouldShowWizard('connection') &&
        isResourceAllowed('connection', 'create') && (
          <WizardButton
            onClick={() => openWizard('connection')}
            icon={<IoLink className='text-xl' />}
            title={dict.connections.create.createConnection}
            description={dict.wizard.connectionDescription}
          />
        )}

      {/* Workflow Wizard */}
      {shouldShowWizard('workflow') &&
        isResourceAllowed('workflow', 'create') && (
          <WizardButton
            onClick={() => openWizard('workflow')}
            icon={<IoPlay className='text-xl' />}
            title={dict.workflow.create.createNewWorkflow}
            description={dict.wizard.workflowDescription}
          />
        )}

      {/* Pipeline Wizard */}
      {shouldShowWizard('pipeline') &&
        isResourceAllowed('workflow', 'create') && (
          <WizardButton
            onClick={() => openWizard('pipeline')}
            icon={<RiFlowChart className='text-xl' />}
            title={dict.workflow.create.configurePipeline}
            description={dict.wizard.workflowDescription}
          />
        )}

      {/* Data Import Wizard Modal */}
      <DataImportWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'data-import' &&
          shouldShowWizard('data-import') &&
          isResourceAllowed('workflow', 'create')
        }
        closeModal={closeModal}
      />

      {/* Data Export Wizard Modal */}
      <DataExportWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'data-export' &&
          shouldShowWizard('data-export') &&
          isResourceAllowed('workflow', 'create')
        }
        closeModal={closeModal}
      />

      {/* Repository Wizard Modal */}
      <RepositoryWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'repository' &&
          shouldShowWizard('repository') &&
          isResourceAllowed('repository', 'create')
        }
        closeModal={closeModal}
      />

      {/* Connection Wizard Modal */}
      <ConnectionWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'connection' &&
          shouldShowWizard('connection') &&
          isResourceAllowed('connection', 'create')
        }
        closeModal={closeModal}
      />

      {/* Workflow Wizard Modal */}
      <WorkflowWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'workflow' &&
          shouldShowWizard('workflow') &&
          isResourceAllowed('workflow', 'create')
        }
        closeModal={closeModal}
        workflowType={undefined}
      />

      {/* Pipeline Wizard Modal */}
      <WorkflowWizardModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'pipeline' &&
          shouldShowWizard('pipeline') &&
          isResourceAllowed('workflow', 'create')
        }
        closeModal={closeModal}
        workflowType='pipeline'
      />
    </div>
  );
}
