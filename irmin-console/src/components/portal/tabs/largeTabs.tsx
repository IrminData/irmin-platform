'use client';

import React, { useState } from 'react';

import Button from '@/components/misc/Button';

/**
 * Large tabs UI component
 *
 * @remarks
 *
 * This component is used to display large tabs with content
 */
export default function LargeTabs({
  tabs,
}: {
  tabs: {
    name: string;
    content: React.ReactNode;
  }[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0].name ?? '');

  const renderTabContent = () => {
    return tabs.find((tab) => tab.name === activeTab)?.content;
  };

  if (tabs.length === 0) return <></>;

  return (
    <>
      <div className='scrollbar-hide mb-6 mt-4 flex w-full max-w-2xl justify-start gap-6 overflow-y-scroll px-2 md:gap-4 xl:mx-4'>
        {tabs.map((tab, idx) => (
          <Button
            key={`large-tab-${idx}`}
            className={`rounded-none border-irmin_green hover:no-underline hover:opacity-70 ${activeTab === tab.name ? 'border-b-2' : 'border-0'}`}
            ariaLabel={`Switch to ${tab.name} tab`}
            size='md'
            variant='link'
            colorScheme={activeTab === tab.name ? 'primary' : 'gray'}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.name}
          </Button>
        ))}
      </div>
      <div className='px-2 lg:px-4'>{renderTabContent()}</div>
    </>
  );
}
