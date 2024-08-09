'use client';

import React, { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import Button from '@/components/common/button/Button';

import { TabsType } from '@/types/internal/Tabs';

/**
 * Large tabs UI component
 *
 * @remarks
 *
 * This component is used to display large tabs with content
 */
export default function Tabs({ tabs }: { tabs: TabsType }) {
  const router = useRouter();
  const path = usePathname();
  const [activeTab, setActiveTab] = useState(tabs[0].slug ?? '');

  useEffect(() => {
    const tabsHaveLinks = tabs.some((tab) => tab.link);
    if (!tabsHaveLinks) return;
    const tab = tabs.find((tab) => {
      if (path === tab.link) {
        return true;
      }
    });
    if (tab) setActiveTab(tab.slug);
  }, [path, tabs]);

  const renderTabContent = () => {
    return tabs.find((tab) => tab.slug === activeTab)?.content ?? null;
  };

  if (tabs.length === 0) return <></>;

  return (
    <>
      <div className='mb-4 mt-4 flex w-full flex-wrap justify-start gap-2 border-b border-gray-200 px-2'>
        {tabs.map((tab, idx) => (
          <div
            key={`large-tab-${idx}-${tab.slug}`}
            className={`border-irmin_green bg-white ${activeTab === tab.slug ? 'border-b-2' : ''}`}
          >
            <Button
              ariaLabel={`Switch to ${tab.name} tab`}
              size='sm'
              variant='outline'
              colorScheme={activeTab === tab.slug ? 'secondary' : 'gray'}
              className={`justify-start rounded-none text-xs shadow-none hover:no-underline`}
              onClick={() => {
                setActiveTab(tab.slug);
                if (tab.link) router.push(tab.link);
              }}
              icon={tab.icon && tab.icon}
            >
              {tab.name}
            </Button>
          </div>
        ))}
      </div>
      {renderTabContent() && (
        <div className='px-2 lg:px-4'>{renderTabContent()}</div>
      )}
    </>
  );
}
