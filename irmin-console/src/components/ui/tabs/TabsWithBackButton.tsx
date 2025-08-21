import { TbChevronLeft } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import type { TabDetails } from '@/types/internal/Tabs';

/**
 * Tabs UI with a back button for navigation.
 *
 * Used for example in the Repository header.
 */
const TabsWithBackButton = ({
  backHref,
  onBackClick,
  backTooltip,
  tabs,
}: {
  backHref?: string;
  onBackClick?: () => void;
  backTooltip: string;
  tabs: TabDetails[];
}) => {
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
