import { IoChevronBack } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';

import { TabsType } from '@/types/internal/Tabs';

/**
 * Tabs UI with a back button for navigation.
 *
 * Used for example in the Repository header.
 */
const TabsWithBackButton = ({
  backHref,
  backTooltip,
  tabs,
}: {
  backHref: string;
  backTooltip: string;
  tabs: TabsType;
}) => {
  return (
    <div className='scrollbar-hide mb-6 flex w-full justify-start gap-2 overflow-y-scroll px-4'>
      <ButtonWithTooltip
        size='icon'
        variant='gray'
        className='rounded-full'
        icon={<IoChevronBack size={24} />}
        href={backHref}
        tooltip={backTooltip}
        aria-label={backTooltip}
      />
      <div className='flex w-full flex-row border-gray-200 md:border-b dark:border-gray-800'>
        {tabs
          .map((tab, idx) => {
            if (tab.hidden) return null;
            return (
              <Button
                key={`tab-${idx}`}
                className={`rounded-b-none border shadow-none hover:no-underline ${tab.active ? 'border-0 border-b-2 border-solid border-accent' : ''}`}
                size='sm'
                variant={'ghost'}
                href={tab.link}
                aria-label={`Tab ${tab.name}`}
                icon={tab.icon}
              >
                {tab.name}
              </Button>
            );
          })
          .filter((tab) => tab)}
      </div>
    </div>
  );
};

export default TabsWithBackButton;
