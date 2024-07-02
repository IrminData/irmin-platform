'use client';

import React, { useCallback, useState } from 'react';

import Button from '@/components/misc/Button';

export default function SettingsTabs({
  tabs,
}: {
  tabs: {
    name: string;
    content: React.ReactNode;
  }[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0].name ?? '');

  const renderTabContent = useCallback(() => {
    return tabs.find((tab) => tab.name === activeTab)?.content;
  }, [tabs, activeTab]);

  if (tabs.length === 0) return <></>;
  return (
    <div className='container box-border overflow-hidden px-2 lg:px-4'>
      <div className='w-full max-w-3xl rounded-lg border-b-2 border-t-2 border-irmin_green bg-white shadow-md'>
        <div className='scrollbar-hide mb-6 mt-4 flex w-full max-w-2xl justify-start gap-2 overflow-y-scroll px-2 md:px-4'>
          {tabs.map((tab, idx) => (
            <Button
              key={`settings-tab-${idx}`}
              className={`rounded-none border-irmin_green hover:no-underline hover:opacity-70 ${activeTab === tab.name ? 'border-b-2' : 'border-0'}`}
              ariaLabel={`Switch to ${tab.name} tab`}
              size='sm'
              variant='link'
              colorScheme={activeTab === tab.name ? 'primary' : 'gray'}
              onClick={() => setActiveTab(tab.name)}
            >
              {tab.name}
            </Button>
          ))}
        </div>
        <div className='scrollbar-hide min-h-80 w-full overflow-scroll py-4'>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
