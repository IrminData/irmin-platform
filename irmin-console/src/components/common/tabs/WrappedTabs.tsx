import Tabs from '@/components/common/tabs/Tabs';

import { TabsType } from '@/types/internal/Tabs';

/**
 * Tabs UI wrapped in a white bordered component
 *
 * @remarks
 *
 * This component is used to display settings tabs with content.
 * Used on various settings pages.
 */
export default function WrappedTabs({ tabs }: { tabs: TabsType }) {
  const filteredTabs = tabs.filter((tab) => !tab.hidden);
  if (filteredTabs.length === 0) return <></>;
  return (
    <div
      id='wrapped-tabs'
      className='container box-border overflow-hidden px-2 lg:px-4'
    >
      <div className='min-h-96 w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white shadow-md dark:bg-irmin_black-600 dark:shadow-black'>
        <Tabs tabs={filteredTabs} />
      </div>
    </div>
  );
}
