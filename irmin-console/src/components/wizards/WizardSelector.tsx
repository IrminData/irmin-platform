'use client';

import { useCallback, useState } from 'react';

import { IoArrowDownCircle, IoArrowUpCircle } from 'react-icons/io5';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import { DataImportWizard } from './DataImportWizard';

/**
 * Wizard selector component that displays available wizards as buttons
 */
export default function WizardSelector() {
  const { isResourceAllowed } = useResourceAllowed();
  const { dict } = useLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedWizard, setSelectedWizard] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setSelectedWizard(null);
  }, []);

  const openWizard = useCallback((wizardType: string) => {
    setSelectedWizard(wizardType);
    setCurrentStep(1);
    setIsModalOpen(true);
  }, []);

  return (
    <div className='contents'>
      <button
        onClick={() => openWizard('data-import')}
        className={`
          flex w-full items-center gap-3 rounded-lg border-2 bg-card p-2
          text-left transition-colors
          hover:border-accent
        `}
      >
        <div
          className={`
            flex size-10 items-center justify-center rounded-full bg-accent/20
            text-accent
          `}
        >
          <IoArrowDownCircle className='text-xl' />
        </div>
        <div>
          <h3 className='font-medium'>{dict.wizard.dataImport}</h3>
          <p className='text-sm text-muted-foreground'>
            {dict.wizard.dataImportDescription}
          </p>
        </div>
      </button>

      <button
        onClick={() => openWizard('data-export')}
        className={`
          flex w-full items-center gap-3 rounded-lg border-2 bg-card p-2
          text-left transition-colors
          hover:border-accent
        `}
      >
        <div
          className={`
            flex size-10 items-center justify-center rounded-full bg-accent/20
            text-accent
          `}
        >
          <IoArrowUpCircle className='text-xl' />
        </div>
        <div>
          <h3 className='font-medium'>{dict.wizard.dataExport}</h3>
          <p className='text-sm text-muted-foreground'>
            {dict.wizard.dataExportDescription}
          </p>
        </div>
      </button>

      {/* Data Import Wizard Modal */}
      <SideModal
        isOpen={
          isModalOpen &&
          selectedWizard === 'data-import' &&
          isResourceAllowed('workflow', 'create')
        }
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.wizard.connectDataSource,
          dict.wizard.setupRepository,
          dict.wizard.configure,
          dict.workflow.create.configureFieldMappings,
          dict.wizard.reviewAndCreate,
        ]}
        title={dict.wizard.setupDataImportWizard}
      >
        <DataImportWizard
          isOpen={isModalOpen}
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>

      {/* Data Export Wizard Modal - TODO: Implement */}
      {selectedWizard === 'data-export' && (
        <SideModal
          isOpen={isModalOpen && selectedWizard === 'data-export'}
          closeModal={closeModal}
          currentStep={currentStep}
          steps={[dict.common.comingSoon]}
          title={dict.wizard.setupDataExportWizard}
        >
          <div className='p-6 text-center'>
            <p
              className={`
                text-gray-600
                dark:text-gray-400
              `}
            >
              {dict.wizard.dataExportWizardComingSoon}
            </p>
          </div>
        </SideModal>
      )}
    </div>
  );
}
