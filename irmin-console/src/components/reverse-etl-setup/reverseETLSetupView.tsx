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
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [reverseETLData, setReverseETLData] = useState<ReverseETLDataType>({
    connectionID: null,
    name: '',
    settings: {},
    cron: '1 0 * JAN *',
  });

  const steps = [
    'Select source data set',
    'Select destination connection',
    'Configure Reverse ETL',
  ];

  return (
    <div className='max-h-screen overflow-y-scroll pt-[38px]'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h3 className='text-xl font-semibold'>Setup a reverse ETL Process</h3>
      </div>
      <div className='flex items-center space-x-4 px-6 py-4'>
        {steps.map((step, index) => (
          <div
            className={`flex items-center ${
              index === steps.length - 1 ? '' : 'mr-0'
            }`}
            key={step}
          >
            <div
              className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full text-sm text-white ${
                currentStep >= index + 1 ? 'bg-ash_gray-500' : 'bg-gray-300'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`text-xs ${
                currentStep >= index + 1 ? 'text-ash_gray-500' : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
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
    </div>
  );
}
