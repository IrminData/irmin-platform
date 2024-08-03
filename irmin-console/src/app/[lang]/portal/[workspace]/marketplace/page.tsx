'use client';

import DataMarketplace from '@/components/marketplace/dataMarketplace';
import PluginMarketplace from '@/components/marketplace/pluginMarketplace';
import LargeTabs from '@/components/portal/tabs/largeTabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Portal marketplace page
 *
 * @remarks
 *
 * This page is used to show the marketplace in the portal.
 * It shows the data marketplace and the plugin marketplace.
 *
 * Marketplace is currently just a placeholder and does not have any functionality.
 *
 * @returns UI for the marketplace
 */
export default function MarketplacePage() {
  const { dict } = useLocale();

  return (
    <LargeTabs
      tabs={[
        {
          name: dict.marketplace.dataMarketplace,
          content: <DataMarketplace />,
        },
        {
          name: dict.marketplace.pluginMarketplace,
          content: <PluginMarketplace />,
        },
        { name: dict.marketplace.myListings, content: <></> },
      ]}
    />
  );
}
