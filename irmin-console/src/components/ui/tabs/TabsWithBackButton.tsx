'use client';

import Link from 'next/link';

import { TbChevronDown, TbChevronLeft } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/utils/tw';

import type { TabDetails } from '@/types/internal/Tabs';

/**
 * Tabs UI with a back button for navigation.
 *
 * Supports an optional `moreTabs` prop to render secondary tabs in a
 * dropdown menu, reducing horizontal clutter on pages with many tabs.
 *
 * @param props - The component props
 * @param props.backHref - The href for the back button
 * @param props.onBackClick - The click handler for the back button
 * @param props.backTooltip - The tooltip for the back button
 * @param props.tabs - The primary tabs to display inline
 * @param props.moreTabs - Secondary tabs rendered inside a "More" dropdown
 * @param props.moreLabel - Localized label for the "More" dropdown trigger
 */
const TabsWithBackButton = ({
  backHref,
  onBackClick,
  backTooltip,
  tabs,
  moreTabs,
  moreLabel,
}: {
  backHref?: string;
  onBackClick?: () => void;
  backTooltip: string;
  tabs: TabDetails[];
  moreTabs?: TabDetails[];
  moreLabel?: string;
}) => {
  const visibleMoreTabs = (moreTabs ?? []).filter((tab) => !tab.hidden);
  const isMoreActive = visibleMoreTabs.some((tab) => tab.active);

  return (
    <div
      className={`
        scrollbar-hide mb-6 flex w-full justify-start gap-2 overflow-y-scroll
        px-4
      `}
    >
      <ButtonWithTooltip
        size='lg'
        variant='gray'
        className='aspect-square overflow-hidden rounded-full'
        icon={<TbChevronLeft size={24} />}
        href={backHref}
        onClick={onBackClick}
        tooltip={backTooltip}
        aria-label={backTooltip}
      />
      <div
        className={`
          flex w-full flex-row border-gray-200
          md:border-b
          dark:border-gray-800
        `}
      >
        {tabs
          .map((tab) => {
            if (tab.hidden) return null;
            return (
              <Button
                key={tab.name}
                className={`
                  rounded-b-none border shadow-none
                  hover:no-underline
                  ${
                    tab.active
                      ? `border-0 border-b-2 border-solid border-accent`
                      : ''
                  }
                `}
                size='lg'
                variant={'ghost'}
                href={tab.link}
                onClick={tab.onClick}
                aria-label={`Tab ${tab.name}`}
                icon={tab.icon}
              >
                {tab.name}
              </Button>
            );
          })
          .filter((tab) => tab)}

        {visibleMoreTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  `
                    rounded-b-none border shadow-none
                    hover:no-underline
                  `,
                  isMoreActive &&
                    'border-0 border-b-2 border-solid border-accent'
                )}
                size='lg'
                variant='ghost'
                aria-label={moreLabel ?? 'More'}
              >
                {moreLabel ?? 'More'}
                <TbChevronDown size={14} className='ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
              {visibleMoreTabs.map((tab) => {
                const itemContent = (
                  <>
                    {tab.icon && <span className='size-4'>{tab.icon}</span>}
                    <span>{tab.name}</span>
                  </>
                );

                if (tab.link) {
                  return (
                    <DropdownMenuItem
                      key={tab.name}
                      asChild
                      className={cn(
                        'flex items-center gap-2',
                        tab.active && 'bg-accent/50 font-medium'
                      )}
                    >
                      <Link href={tab.link}>{itemContent}</Link>
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={tab.name}
                    onClick={tab.onClick}
                    className={cn(
                      'flex items-center gap-2',
                      tab.active && 'bg-accent/50 font-medium'
                    )}
                  >
                    {itemContent}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default TabsWithBackButton;
