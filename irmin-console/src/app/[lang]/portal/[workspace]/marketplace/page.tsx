'use client';

import React from 'react';

import DataMarketplace from '@/components/marketplace/dataMarketplace';
import PluginMarketplace from '@/components/marketplace/pluginMarketplace';
import LargeTabs from '@/components/tabs/largeTabs';

import { useLocale } from '@/context/LocaleContext';

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
