'use client';

import React, { useState } from 'react';

import AppTitle from '@/components/appTitle';
import PluginMarketplaceFilters from '@/components/marketplace/pluginMarketplaceFilters';
import PluginMarketplaceListingCard from '@/components/marketplace/pluginMarketplaceListingCard';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

export interface MarketplacePlugin {
  id: number;
  name: string;
  provider: string;
  price: number;
  category: string;
  description?: string;
  connected: boolean;
}

export default function PluginMarketplace() {
  const { dict } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  // Hypothetical plugins data, you would fetch this from an API in a real app
  const plugins: MarketplacePlugin[] = [
    {
      id: 1,
      name: 'Google Analytics',
      provider: 'Google',
      price: 0,
      connected: true,
      category: 'Analytics',
      description: 'Integrate Google Analytics to track and analyze your data.',
    },
    {
      id: 2,
      name: 'Salesforce CRM',
      provider: 'Salesforce',
      price: 50,
      connected: false,
      category: 'CRM',
      description: 'Connect Salesforce CRM to manage your customer data.',
    },
    {
      id: 3,
      name: 'Stripe Payments',
      provider: 'Stripe',
      price: 20,
      connected: true,
      category: 'Payments',
      description: 'Integrate Stripe to handle your payment processing.',
    },
    {
      id: 4,
      name: 'HubSpot Marketing',
      provider: 'HubSpot',
      price: 30,
      connected: false,
      category: 'Marketing',
      description: 'Connect HubSpot for marketing automation and analytics.',
    },
    {
      id: 5,
      name: 'Slack Notifications',
      provider: 'Slack',
      price: 0,
      connected: true,
      category: 'Communication',
      description: 'Integrate Slack to send notifications and alerts.',
    },
    {
      id: 6,
      name: 'Mailchimp',
      provider: 'Mailchimp',
      price: 25,
      connected: false,
      category: 'Email Marketing',
      description: 'Integrate Mailchimp for email marketing campaigns.',
    },
  ];

  // Hypothetical categories, you would fetch this from an API in a real app
  const categories = [
    dict.marketplace.all,
    'Analytics',
    'CRM',
    'Payments',
    'Marketing',
    'Communication',
    'Email Marketing',
  ];

  // Filter plugins based on selected category and search term
  const filteredPlugins = plugins
    .filter(
      (plugin) =>
        selectedCategory === '' ||
        selectedCategory === dict.marketplace.all ||
        plugin.category === selectedCategory
    )
    .filter(
      (plugin) =>
        search === '' ||
        plugin.name.toLowerCase().includes(search.toLowerCase()) ||
        plugin.provider.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <AppTitle title={dict.marketplace.pluginMarketplace} />
      <div className='p-4 pb-24'>
        <div className='mb-4'>
          <Input
            size='md'
            variant='outline'
            colorScheme='gray'
            className='w-full'
            type='text'
            placeholder={dict.marketplace.searchPlugins}
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='mb-8'>
          <PluginMarketplaceFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
        {filteredPlugins.filter((p) => p.connected).length > 0 && (
          <div>
            <h2 className='my-4 text-xl font-semibold'>
              {dict.marketplace.activePlugins}
            </h2>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredPlugins
                .filter((p) => p.connected)
                .map((plugin) => (
                  <PluginMarketplaceListingCard
                    key={plugin.id}
                    plugin={plugin}
                  />
                ))}
            </div>
          </div>
        )}
        {filteredPlugins.filter((p) => !p.connected).length > 0 && (
          <div>
            <h2 className='my-4 text-xl font-semibold'>
              {dict.marketplace.browsePlugins}
            </h2>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredPlugins
                .filter((p) => !p.connected)
                .map((plugin) => (
                  <PluginMarketplaceListingCard
                    key={plugin.id}
                    plugin={plugin}
                  />
                ))}
            </div>
          </div>
        )}
        {filteredPlugins.length === 0 && (
          <div className='mt-8 text-center text-gray-400'>
            {dict.marketplace.pluginsNotFound}
          </div>
        )}
      </div>
    </>
  );
}
