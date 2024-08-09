'use client';

import { useState } from 'react';

import Input from '@/components/common/form/Input';
import DataMarketplaceFilters from '@/components/marketplace/data-marketplace/partials/DataMarketplaceFilters';
import DataMarketplaceListingCard from '@/components/marketplace/data-marketplace/partials/DataMarketplaceListingCard';

import { useLocale } from '@/context/LocaleContext';

import { MarketplaceRepository } from '@/types/internal/Marketplace';

/**
 * Data marketplace UI component
 *
 * @remarks
 *
 * This component is used to display the data marketplace on the portal.
 * It displays a list of repositories available for purchase.
 *
 * It includes a search input, industry filters, and a list of repositories.
 *
 * The data marketplace is used to browse and connect repositories to Workspaces.
 *
 * @todo This is just a UI to play around
 */
export default function DataMarketplaceSection() {
  const { dict } = useLocale();
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [search, setSearch] = useState('');

  // TODO: Implement real data fetching
  const repositories: MarketplaceRepository[] = [
    {
      id: 1,
      name: 'Restaurants in Finland',
      source: 'Tripadvisor',
      price: 120,
      connected: true,
      industry: 'Food & Beverage',
      description:
        'A list of all restaurants in Finland with ratings and reviews',
    },
    {
      id: 2,
      name: 'Population data',
      source: 'Statistics Finland',
      price: 200,
      connected: false,
      industry: 'Government',
      description: 'Population data for all municipalities in Finland',
    },
    {
      id: 3,
      name: 'Weather data',
      source: 'FMI',
      price: 50,
      connected: true,
      industry: 'Utilities',
      description: 'Real-time weather data for all cities in Finland',
    },
    {
      id: 4,
      name: 'Traffic data',
      source: 'Liikennevirasto',
      price: 100,
      connected: false,
      industry: 'Transportation',
      description: 'Real-time traffic data for all highways in Finland',
    },
    {
      id: 5,
      name: 'Housing data',
      source: 'Oikotie',
      price: 150,
      connected: false,
      industry: 'Real Estate',
      description: 'Real-time housing data for all cities in Finland',
    },
    {
      id: 6,
      name: 'Election results',
      source: 'Vaalit.fi',
      price: 80,
      connected: true,
      industry: 'Government',
      description: 'Election results for all municipalities in Finland',
    },
    {
      id: 7,
      name: 'Covid-19 data',
      source: 'THL',
      price: 0,
      connected: true,
      industry: 'Healthcare',
      description: 'Real-time Covid-19 data for all cities in Finland',
    },
    {
      id: 8,
      name: 'Energy consumption',
      source: 'Fingrid',
      price: 100,
      connected: false,
      industry: 'Utilities',
      description:
        'Real-time energy consumption data for all cities in Finland',
    },
    {
      id: 9,
      name: 'Social media data',
      source: 'Twitter',
      price: 50,
      connected: false,
      industry: 'Social Media',
      description: 'Real-time social media data for all cities in Finland',
    },
    {
      id: 10,
      name: 'Stock data',
      source: 'Nasdaq',
      price: 200,
      connected: false,
      industry: 'Financial Services',
      description: 'Real-time stock data for all companies in Finland',
    },
    {
      id: 11,
      name: 'Tourist attractions',
      source: 'Visit Finland',
      price: 80,
      connected: true,
      industry: 'Travel & Tourism',
      description: 'A list of all tourist attractions in Finland',
    },
    {
      id: 12,
      name: 'Air quality data',
      source: 'Ilmatieteen laitos',
      price: 70,
      connected: true,
      industry: 'Environmental',
      description: 'Real-time air quality data for all cities in Finland',
    },
    {
      id: 13,
      name: 'Employment statistics',
      source: 'Työ- ja elinkeinoministeriö',
      price: 120,
      connected: false,
      industry: 'Labour Market',
      description: 'Employment statistics for all municipalities in Finland',
    },
    {
      id: 14,
      name: 'Retail sales data',
      source: 'Tilastokeskus',
      price: 90,
      connected: true,
      industry: 'Retail',
      description: 'Retail sales data for all cities in Finland',
    },
    {
      id: 15,
      name: 'Tourism accommodation statistics',
      source: 'Visit Finland',
      price: 100,
      connected: false,
      industry: 'Travel & Tourism',
      description: 'Tourism accommodation statistics for all cities in Finland',
    },
    {
      id: 16,
      name: 'Education data',
      source: 'Opetushallitus',
      price: 150,
      connected: true,
      industry: 'Education',
      description: 'Education data for all schools in Finland',
    },
    {
      id: 17,
      name: 'Crime statistics',
      source: 'Poliisi',
      price: 60,
      connected: false,
      industry: 'Law Enforcement',
      description: 'Crime statistics for all cities in Finland',
    },
    {
      id: 18,
      name: 'Agricultural production data',
      source: 'Maanmittauslaitos',
      price: 110,
      connected: true,
      industry: 'Agriculture',
      description: 'Agricultural production data for all cities in Finland',
    },
    {
      id: 19,
      name: 'Telecommunications data',
      source: 'Traficom',
      price: 80,
      connected: false,
      industry: 'Telecommunications',
      description: 'Telecommunications data for all cities in Finland',
    },
    {
      id: 20,
      name: 'Tourism expenditure statistics',
      source: 'Visit Finland',
      price: 95,
      connected: true,
      industry: 'Travel & Tourism',
      description: 'Tourism expenditure statistics for all cities in Finland',
    },
  ];

  // Get unique industries from repositories
  const industries: string[] = [dict.marketplace.all];
  repositories.forEach((repository) => {
    if (!industries.includes(repository.industry)) {
      industries.push(repository.industry);
    }
  });

  // Filter repositories based on selected industry and department
  const filteredListings = repositories
    .filter(
      (repository) =>
        selectedIndustry === '' ||
        selectedIndustry === dict.marketplace.all ||
        repository.industry === selectedIndustry
    )
    .filter(
      (repository) =>
        search === '' ||
        repository.name.toLowerCase().includes(search.toLowerCase()) ||
        repository.source.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <div className='p-4 pb-24'>
        <h3 className='text-lg'>{dict.marketplace.dataMarketplace}</h3>
        <div className='mb-4 mt-2'>
          <Input
            size='sm'
            variant='solid'
            colorScheme='gray'
            className='w-full'
            type='text'
            placeholder={dict.marketplace.searchRepositories}
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='mb-8'>
          <DataMarketplaceFilters
            industries={industries}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
          />
        </div>
        {filteredListings.filter((d) => d.connected).length > 0 && (
          <div>
            <h3 className='my-4 text-lg'>
              {dict.marketplace.activeRepositories}
            </h3>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredListings
                .filter((d) => d.connected)
                .map((repository) => (
                  <DataMarketplaceListingCard
                    key={repository.id}
                    repository={repository}
                  />
                ))}
            </div>
          </div>
        )}
        {filteredListings.filter((d) => !d.connected).length > 0 && (
          <div>
            <h2 className='my-4 text-lg'>
              {dict.marketplace.browseRepositories}
            </h2>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredListings
                .filter((d) => !d.connected)
                .map((repository) => (
                  <DataMarketplaceListingCard
                    key={repository.id}
                    repository={repository}
                  />
                ))}
            </div>
          </div>
        )}
        {filteredListings.length === 0 && (
          <div className='mt-8 text-center text-gray-400'>
            {dict.marketplace.dataRepositoriesNotFound}
          </div>
        )}
      </div>
    </>
  );
}
