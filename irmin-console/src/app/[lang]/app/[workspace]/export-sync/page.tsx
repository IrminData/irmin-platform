'use client';

import { useState } from 'react';

import AppTitle from '@/components/appTitle';
import ExportSetupView from '@/components/export-sync-setup/exportSetupView';
import SideModal from '@/components/misc/SideModal';
import ExportTable from '@/components/tables/exportTable';

import { useLocale } from '@/context/LocaleContext';

export default function ExportSyncPage() {
  const { dict } = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    dict.export.selectSourceDataSet,
    dict.export.selectDestinationConnection,
    dict.export.configureExport,
  ];

  return (
    <>
      <AppTitle title={dict.export.exportSyncs} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={steps}
        title={dict.export.createNewExportSync}
      >
        <ExportSetupView
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <ExportTable
        processes={[
          {
            id: 1,
            name: 'Customer Data Sync',
            source: 'Salesforce',
            destination: 'BigQuery',
            status: 'running',
            details: [
              'Syncing customer data from Salesforce to BigQuery.',
              'Last sync: 2024-06-20 10:00 UTC',
              'Next sync scheduled: 2024-06-21 10:00 UTC',
            ],
          },
          {
            id: 2,
            name: 'Order Data Sync',
            source: 'UpCharge rents, users and venues',
            destination: 'Snowflake',
            status: 'paused',
            details: [
              'Syncing order data from Shopify to Snowflake.',
              'Last sync: 2024-06-19 08:00 UTC',
              'Next sync scheduled: Not scheduled',
            ],
          },
          {
            id: 3,
            name: 'Loaction Data Sync',
            source: 'UpCharge locations',
            destination: 'Redshift',
            status: 'error',
            details: [
              'Syncing marketing data from HubSpot to Redshift.',
              'Last sync: 2024-06-18 07:00 UTC',
              'Error: Network timeout during last sync.',
            ],
          },
          {
            id: 4,
            name: 'CRM leed sync',
            source: 'Restaurants in Finland',
            destination: 'PostgreSQL',
            status: 'warning',
            details: [
              'Syncing product data from Magento to PostgreSQL.',
              'Last sync: 2024-06-20 12:00 UTC',
              'Next sync scheduled: 2024-06-21 12:00 UTC',
            ],
          },
        ]}
      />
    </>
  );
}
