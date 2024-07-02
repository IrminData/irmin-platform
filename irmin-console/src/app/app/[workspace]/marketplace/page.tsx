'use client';

import React from 'react';

import DataMarketplace from '@/components/marketplace/dataMarketplace';
import PluginMarketplace from '@/components/marketplace/pluginMarketplace';
import LargeTabs from '@/components/tabs/largeTabs';

export default function MarketplacePage() {
  return (
    <LargeTabs
      tabs={[
        { name: 'Data Marketplace', content: <DataMarketplace /> },
        { name: 'Plugins & Extensions', content: <PluginMarketplace /> },
        { name: 'My Listings', content: <></> },
      ]}
    />
  );
}
