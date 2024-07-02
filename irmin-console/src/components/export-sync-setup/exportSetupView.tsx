'use client';

import React, { useState } from 'react';

import ConfigureExport from '@/components/export-sync-setup/configureExport';
import SelectSourceDataSet from '@/components/export-sync-setup/selectSourceDataSet';

import { ConnectionDetailsAndSettings } from '@/types/Connector';

import SelectDestinationConnection from './selectDestinationConnection';

export interface ExportDataType {
  connectionID: null | number;
  name: string;
  settings: ConnectionDetailsAndSettings;
  cron: string;
}

const existingConnections = [
  { id: 1, name: 'Salesforce' },
  { id: 2, name: 'Shopify / verkkokauppa' },
  { id: 3, name: 'HubSpot CRM Finland' },
  { id: 4, name: 'Pipedrive CRM US' },
  { id: 5, name: 'Magento / B2B verkkokauppa' },
  { id: 6, name: 'Google Big Query / Production line data' },
];

const existingDataSets = [
  { id: 1, name: 'UpCharge rents, users and venues' },
  { id: 2, name: 'UpCharge locations' },
  { id: 3, name: 'Restaurants in Finland' },
  { id: 4, name: 'Salesforce' },
];

export default function ExportSetupView({
  setIsOpen,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [exportData, setExportData] = useState<ExportDataType>({
    connectionID: null,
    name: '',
    settings: {},
    cron: '1 0 * JAN *',
  });

  return (
    <>
      {currentStep === 1 && (
        <SelectSourceDataSet
          dataSets={existingDataSets}
          setExportData={setExportData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <SelectDestinationConnection
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
