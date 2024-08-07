'use client';

import LargeTabs from '@/components/common/tabs/LargeTabs';
import DataMarketplaceSection from '@/components/marketplace/data-marketplace/DataMarketplaceSection';
import PluginMarketplaceSection from '@/components/marketplace/plugin-marketplace/PluginMarketplaceSection';

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
 */
export default function MarketplacePage() {
  const { dict } = useLocale();

  return (
    <LargeTabs
      tabs={[
        {
          name: dict.marketplace.dataMarketplace,
          content: <DataMarketplaceSection />,
        },
        {
          name: dict.marketplace.pluginMarketplace,
          content: <PluginMarketplaceSection />,
        },
        { name: dict.marketplace.myListings, content: <></> },
      ]}
    />
  );
}
