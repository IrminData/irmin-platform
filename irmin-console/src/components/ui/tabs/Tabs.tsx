'use client';

import { startTransition, useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { TabDetails } from '@/types/internal/Tabs';

/**
 * Large tabs UI component
 *
 * @remarks
 *
 * This component is used to display large tabs with content
 */
export default function Tabs({ tabs }: { tabs: TabDetails[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(tabs[0].slug ?? '');

  useEffect(() => {
    // If tabs are links, active tab needs to be set based on the path
    const tabsHaveLinks = tabs.some((tab) => tab.link);
    if (!tabsHaveLinks) return;

    queueMicrotask(() => {
      // Match by full path
      const exactMatchTab = tabs.find(
        (tab) => tab.link && pathname === tab.link
      );
      if (exactMatchTab) {
        setActiveTab(exactMatchTab.slug ?? exactMatchTab.name);
        return;
      }

      // Find the tab with the longest matching prefix
      let closestMatchTab: TabDetails | undefined;
      let maxPrefixLength = 0;

      tabs.forEach((tab) => {
        if (
          tab.link &&
          pathname.startsWith(tab.link) &&
          tab.link.length > maxPrefixLength
        ) {
          closestMatchTab = tab;
          maxPrefixLength = tab.link.length;
        }
      });

      if (closestMatchTab) {
        setActiveTab(closestMatchTab.slug ?? closestMatchTab.name);
      }
    });
  }, [pathname, tabs]);

  const tabContent =
    tabs.find((tab) => tab.slug === activeTab)?.content ?? null;

  if (tabs.length === 0) return <></>;

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div
          className={`
            my-4 flex w-full flex-wrap justify-start gap-2 border-border px-2
            md:border-b
          `}
        >
          {tabs.map((tab) => {
            const button = (
              <Button
                key={tab.name}
                className={`
                  border-0 border-accent shadow-none
                  hover:no-underline
                  ${activeTab === tab.slug ? `rounded-b-none border-b-2` : ''}
                `}
                size='sm'
                variant={'outline'}
                aria-label={`Switch to ${tab.name} tab`}
                onClick={() => {
                  startTransition(() => {
                    setActiveTab(tab.slug ?? tab.name);
                  });
                  if (tab.link) router.push(tab.link);
                }}
                icon={tab.icon && tab.icon}
              >
                {tab.name}
              </Button>
            );
            if (!tab.tooltip) return button;
            return (
              <Tooltip key={tab.name}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side='bottom'>{tab.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      {tabContent && (
        <div
          className={`
            px-2
            lg:px-4
          `}
        >
          {tabContent}
        </div>
      )}
    </>
  );
}
