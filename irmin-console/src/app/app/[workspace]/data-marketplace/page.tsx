'use client';

import React, { useState } from 'react';
import AppTitle from '@/components/appTitle';
import MarketplaceFilters from '@/components/marketplaceFilters';
import MarketplaceListingCard from '@/components/marketplaceListingCard';

export default function DataMarketplacePage() {
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [search, setSearch] = useState('');

  // Hypothetical dataset info, you would fetch this from an API in a real app
  const datasets = [
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

  // Hypothetical industries and departments, you would fetch this from an API in a real app
  const industries = [
    'All',
    'Food & Beverage',
    'Government',
    'Utilities',
    'Transportation',
    'Real Estate',
    'Healthcare',
    'Social Media',
    'Financial Services',
    'Travel & Tourism',
    'Environmental',
    'Labour Market',
    'Retail',
    'Education',
    'Law Enforcement',
    'Agriculture',
    'Telecommunications',
  ];

  // Filter datasets based on selected industry and department
  const filteredDatasets = datasets
    .filter(
      (dataset) =>
        selectedIndustry === '' ||
        selectedIndustry === 'All' ||
        dataset.industry === selectedIndustry
    )
    .filter(
      (dataset) =>
        search === '' ||
        dataset.name.toLowerCase().includes(search.toLowerCase()) ||
        dataset.source.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <AppTitle title='Data Marketplace' />
      <div className='p-4'>
        <div className='mb-8'>
          <input
            className='w-full rounded border p-2'
            type='search'
            placeholder='Search for public datasets you would like to connect and use'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='mb-8'>
          <MarketplaceFilters
            industries={industries}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
          />
        </div>
        {filteredDatasets.filter((d) => d.connected).length > 0 && (
          <div>
            <h2 className='my-4 text-xl font-semibold'>Active data sets</h2>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredDatasets
                .filter((d) => d.connected)
                .map((dataset) => (
                  <MarketplaceListingCard key={dataset.id} dataset={dataset} />
                ))}
            </div>
          </div>
        )}
        {filteredDatasets.filter((d) => !d.connected).length > 0 && (
          <div>
            <h2 className='my-4 text-xl font-semibold'>Browse data sets</h2>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
              {filteredDatasets
                .filter((d) => !d.connected)
                .map((dataset) => (
                  <MarketplaceListingCard key={dataset.id} dataset={dataset} />
                ))}
            </div>
          </div>
        )}
        {filteredDatasets.length === 0 && (
          <div className='mt-8 text-center text-gray-400'>
            No data sets found
          </div>
        )}
      </div>
    </>
  );
}
