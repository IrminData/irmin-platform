'use client';

import AppTitle from '@/components/appTitle';
import ConnectionTable from '@/components/tables/connectionTable';
import ConnectionSetupView from '@/components/connection-setup/connectionSetupView';
import SideModal from '@/components/misc/SideModal';
import { useState } from 'react';

export default function ConnectionsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    'Select a connector',
    'Establish connection',
    'Connection settings',
    'Configure sync',
  ];

  return (
    <>
      <AppTitle title='Connections' />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={steps}
        title='Create a new connection'
      >
        <ConnectionSetupView
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <ConnectionTable
        dataSources={[
          {
            id: 0,
            name: 'ExampleAnalyticsSync1',
            connector: 'Google Analytics',
            nextSync: 'in 3 hours',
            nextSyncTimestamp: new Date(),
            status: 'running',
            parts: [
              'audience_overview',
              'traffic_sources',
              'content_overview',
              'events',
              'ecommerce',
            ],
          },
          {
            id: 1,
            name: 'Main Ads account sync',
            connector: 'Google AdSense',
            nextSync: 'in 8 hours',
            nextSyncTimestamp: new Date(),
            status: 'errors',
            parts: [
              'ad_units',
              'ad_units_performance',
              'ad_units_performance_by_country',
              'ad_units_performance_by_device',
              'ad_units_performance_by_ad_size',
            ],
          },
          {
            id: 2,
            name: 'App database',
            connector: 'MySQL',
            nextSync: 'in 10 minutes',
            nextSyncTimestamp: new Date(),
            status: 'stopped',
            parts: ['users', 'orders', 'products', 'categories', 'reviews'],
          },
          {
            id: 3,
            name: 'Main Meta ads',
            connector: 'Facebook Ads',
            nextSync: 'in 30 minutes',
            nextSyncTimestamp: new Date(),
            status: 'running',
            parts: [
              'ad_units',
              'ad_units_performance',
              'ad_units_performance_by_country',
              'ad_units_performance_by_device',
              'ad_units_performance_by_ad_size',
            ],
          },
        ]}
      />
    </>
  );
}
