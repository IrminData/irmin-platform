'use client';

import React, { useState } from 'react';
import SelectSourceDataSet from '@/components/reverse-etl-setup/selectSourceDataSet';
import ConfigureReverseETL from '@/components/reverse-etl-setup/configureReverseETL';
import SelectDestinationConnection from './selectDestinationConnection';

export interface ReverseETLDataType {
  connectionID: null | number;
  name: string;
  settings: any;
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

export default function ReverseETLSetupView({
  setIsOpen,
  currentStep,
  setCurrentStep,
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [reverseETLData, setReverseETLData] = useState<ReverseETLDataType>({
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
          setReverseETLData={setReverseETLData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <SelectDestinationConnection
          connections={existingConnections}
          setReverseETLData={setReverseETLData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <ConfigureReverseETL
          reverseETLData={reverseETLData}
          setReverseETLData={setReverseETLData}
          setCurrentStep={setCurrentStep}
          setIsOpen={setIsOpen}
        />
      )}
    </>
  );
}
