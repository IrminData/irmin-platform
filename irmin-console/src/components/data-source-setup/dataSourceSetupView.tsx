'use client';

import React, { useState } from 'react';

import { AiFillGoogleCircle } from 'react-icons/ai';
import { FiDatabase, FiLayers, FiFileText } from 'react-icons/fi';
import {
  SiGoogleanalytics,
  SiFacebook,
  SiGoogleads,
  SiGooglesearchconsole,
  SiStripe,
  SiShopify,
  SiWoocommerce,
} from 'react-icons/si';

import { SelectConnector } from '@/components/data-source-setup/selectConnector';
import DefineConnectionDetails from '@/components/data-source-setup/defineConnectionDetails';
import DefineConnectionSettings from '@/components/data-source-setup/defineConnectionSettings';
import DefineSync from '@/components/data-source-setup/defineSync';

export interface connectionDataType {
  connectionID: null | number;
  name: string;
  connector: null | number;
  connectionDetails: any;
  settings: any;
  cron: string;
}

const connectors = [
  { name: 'SFTP', icon: FiFileText, id: 1 },
  { name: 'FTP', icon: FiFileText, id: 2 },
  { name: 'S3', icon: FiFileText, id: 3 },
  { name: 'PostgreSQL', icon: FiDatabase, id: 4 },
  { name: 'MySQL database', icon: FiDatabase, id: 5 },
  { name: 'MongoDB database', icon: FiLayers, id: 6 },
  { name: 'Facebook Ads', icon: SiFacebook, id: 7 },
  { name: 'Google Analytics', icon: SiGoogleanalytics, id: 8 },
  { name: 'Google AdSense', icon: SiGoogleads, id: 9 },
  { name: 'Google Search Console', icon: SiGooglesearchconsole, id: 10 },
  { name: 'Stripe', icon: SiStripe, id: 11 },
  { name: 'Shopify', icon: SiShopify, id: 12 },
  { name: 'WooCommerce', icon: SiWoocommerce, id: 13 },
  { name: 'Google Drive', icon: AiFillGoogleCircle, id: 14 },
  { name: 'Google Cloud Storage', icon: AiFillGoogleCircle, id: 15 },
  { name: 'Google Cloud BigQuery', icon: AiFillGoogleCircle, id: 16 },
];

export default function DataSourceSetupView({
  setIsOpen,
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [connectionData, setConnectionData] = useState<connectionDataType>({
    connectionID: null,
    name: '',
    connector: null,
    connectionDetails: {},
    settings: {},
    cron: '1 0 * JAN *',
  });

  const steps = [
    'Select a connector',
    'Establish connection',
    'Connection settings',
    'Configure sync',
  ];

  return (
    <div className='max-h-screen overflow-y-scroll pt-[38px]'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h3 className='text-xl font-semibold'>Setup a connection</h3>
      </div>
      <div className='flex items-center justify-between space-x-1 px-6 py-4'>
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
        <SelectConnector
          connectors={connectors}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <DefineConnectionDetails
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <DefineConnectionSettings
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && (
        <DefineSync
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
          setIsOpen={setIsOpen}
        />
      )}
    </div>
  );
}
