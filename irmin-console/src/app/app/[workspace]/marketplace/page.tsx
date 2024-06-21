'use client';

import DataMarketplace from '@/components/marketplace/dataMarketplace';
import PluginMarketplace from '@/components/marketplace/pluginMarketplace';
import React, { useState } from 'react';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('data-marketplace');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'data-marketplace':
        return <DataMarketplace />;
      case 'plugins-extensions':
        return <PluginMarketplace />;
      case 'my-listings':
        return <></>;
      default:
        return <DataMarketplace />;
    }
  };

  return (
    <>
      <div className='mb-6 mt-4 flex border-b'>
        <button
          className={`px-4 py-2 text-lg font-normal ${
            activeTab === 'data-marketplace'
              ? 'border-b-2 border-ash_gray text-ash_gray'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('data-marketplace')}
        >
          Data Marketplace
        </button>
        <button
          className={`ml-6 px-4 py-2 text-lg font-normal ${
            activeTab === 'plugins-extensions'
              ? 'border-b-2 border-ash_gray text-ash_gray'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('plugins-extensions')}
        >
          Plugins & Extensions
        </button>
        <button
          className={`ml-6 px-4 py-2 text-lg font-normal ${
            activeTab === 'my-listings'
              ? 'border-b-2 border-ash_gray text-ash_gray'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('my-listings')}
        >
          My Listings
        </button>
      </div>
      <div>{renderTabContent()}</div>
    </>
  );
}
