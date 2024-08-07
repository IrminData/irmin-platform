'use client';

import React, { useEffect, useState } from 'react';

import ConfigureExport from '@/components/workflow/export/create/configureExport';
import SelectDestination from '@/components/workflow/export/create/selectDestination';
import SelectSource from '@/components/workflow/export/create/selectSource';

import { ExportSetup } from '@/types/internal/ExportSetup';

const initialExportData: ExportSetup = {
  connectionID: null,
  name: '',
  settings: {},
  cron: '1 0 * JAN *',
};

// TODO: Show real data here
const existingConnections = [
  { id: 1, name: 'Salesforce' },
  { id: 2, name: 'Shopify / verkkokauppa' },
  { id: 3, name: 'HubSpot CRM Finland' },
  { id: 4, name: 'Pipedrive CRM US' },
  { id: 5, name: 'Magento / B2B verkkokauppa' },
  { id: 6, name: 'Google Big Query / Production line data' },
];

// TODO: Show real data here
const existingDataRepositories = [
  { id: 1, name: 'UpCharge rents, users and venues' },
  { id: 2, name: 'UpCharge locations' },
  { id: 3, name: 'Restaurants in Finland' },
  { id: 4, name: 'Salesforce' },
];

/**
 * Export setup view
 *
 * @remarks
 *
 * View to setup a new export sync.
 *
 * It is wrapped in a side modal and is used to setup a new
 * export. It guides the user through the setup steps.
 *
 * The component also is responsible for managing the state
 * of the export sync creation process.
 */
export default function ExportSetupView({
  isOpen,
  setIsOpen,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [exportData, setExportData] = useState(initialExportData);

  // Reset export data when modal is closed
  useEffect(() => {
    setCurrentStep(1);
    setExportData(initialExportData);
  }, [isOpen, setCurrentStep, setExportData]);

  return (
    <>
      {currentStep === 1 && (
        <SelectSource
          repositories={existingDataRepositories}
          setExportData={setExportData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <SelectDestination
          connections={existingConnections}
          setExportData={setExportData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <ConfigureExport
          exportData={exportData}
          setExportData={setExportData}
          setCurrentStep={setCurrentStep}
          setIsOpen={setIsOpen}
        />
      )}
    </>
  );
}
