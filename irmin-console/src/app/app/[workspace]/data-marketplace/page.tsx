"use client";

import React, { useState } from "react";
import AppTitle from "@/components/appTitle";
import MarketplaceFilters from "@/components/marketplaceFilters";

const DatasetCard = ({
  dataset,
}: {
  dataset: {
    id: number;
    name: string;
    source: string;
    price: number;
    connected: boolean;
  };
}) => {
  return (
    <div className="border rounded shadow hover:shadow-lg transition duration-300 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-800 font-medium">{dataset.name}</span>
        {dataset.connected ? (
          <span className="text-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="mb-4 text-sm text-gray-600">Source: {dataset.source}</div>
      <div className="flex justify-between items-center">
        <span
          className={`text-${
            dataset.connected ? "green" : "gray"
          }-700 font-semibold`}
        >
          ${dataset.price}/month
        </span>
        <button
          className="bg-ash_gray hover:bg-ash_gray-700 text-white py-2 px-4 rounded"
          onClick={() => {
            /* function to handle connect */
          }}
        >
          {dataset.connected ? "Connected" : "Connect"}
        </button>
      </div>
    </div>
  );
};

export default function DataMarketplacePage() {
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [search, setSearch] = useState("");

  // Hypothetical dataset info, you would fetch this from an API in a real app
  const datasets = [
    {
      id: 1,
      name: "Restaurants in Finland",
      source: "Tripadvisor",
      price: 120,
      connected: true,
      industry: "Food & Beverage",
    },
    {
      id: 2,
      name: "Population data",
      source: "Statistics Finland",
      price: 200,
      connected: false,
      industry: "Government",
    },
    {
      id: 3,
      name: "Weather data",
      source: "FMI",
      price: 50,
      connected: true,
      industry: "Utilities",
    },
    {
      id: 4,
      name: "Traffic data",
      source: "Liikennevirasto",
      price: 100,
      connected: false,
      industry: "Transportation",
    },
    {
      id: 5,
      name: "Housing data",
      source: "Oikotie",
      price: 150,
      connected: false,
      industry: "Real Estate",
    },
    {
      id: 6,
      name: "Election results",
      source: "Vaalit.fi",
      price: 80,
      connected: true,
      industry: "Government",
    },
    {
      id: 7,
      name: "Covid-19 data",
      source: "THL",
      price: 0,
      connected: true,
      industry: "Healthcare",
    },
    {
      id: 8,
      name: "Energy consumption",
      source: "Fingrid",
      price: 100,
      connected: false,
      industry: "Utilities",
    },
    {
      id: 9,
      name: "Social media data",
      source: "Twitter",
      price: 50,
      connected: false,
      industry: "Social Media",
    },
    {
      id: 10,
      name: "Stock data",
      source: "Nasdaq",
      price: 200,
      connected: false,
      industry: "Financial Services",
    },
    {
      id: 11,
      name: "Tourist attractions",
      source: "Visit Finland",
      price: 80,
      connected: true,
      industry: "Travel & Tourism",
    },
    {
      id: 12,
      name: "Air quality data",
      source: "Ilmatieteen laitos",
      price: 70,
      connected: true,
      industry: "Environmental",
    },
    {
      id: 13,
      name: "Employment statistics",
      source: "Työ- ja elinkeinoministeriö",
      price: 120,
      connected: false,
      industry: "Labour Market",
    },
    {
      id: 14,
      name: "Retail sales data",
      source: "Tilastokeskus",
      price: 90,
      connected: true,
      industry: "Retail",
    },
    {
      id: 15,
      name: "Tourism accommodation statistics",
      source: "Visit Finland",
      price: 100,
      connected: false,
      industry: "Travel & Tourism",
    },
    {
      id: 16,
      name: "Education data",
      source: "Opetushallitus",
      price: 150,
      connected: true,
      industry: "Education",
    },
    {
      id: 17,
      name: "Crime statistics",
      source: "Poliisi",
      price: 60,
      connected: false,
      industry: "Law Enforcement",
    },
    {
      id: 18,
      name: "Agricultural production data",
      source: "Maanmittauslaitos",
      price: 110,
      connected: true,
      industry: "Agriculture",
    },
    {
      id: 19,
      name: "Telecommunications data",
      source: "Traficom",
      price: 80,
      connected: false,
      industry: "Telecommunications",
    },
    {
      id: 20,
      name: "Tourism expenditure statistics",
      source: "Visit Finland",
      price: 95,
      connected: true,
      industry: "Travel & Tourism",
    },
  ];

  // Hypothetical industries and departments, you would fetch this from an API in a real app
  const industries = [
    "All",
    "Food & Beverage",
    "Government",
    "Utilities",
    "Transportation",
    "Real Estate",
    "Healthcare",
    "Social Media",
    "Financial Services",
    "Travel & Tourism",
    "Environmental",
    "Labour Market",
    "Retail",
    "Education",
    "Law Enforcement",
    "Agriculture",
    "Telecommunications",
  ];

  // Filter datasets based on selected industry and department
  const filteredDatasets = datasets
    .filter(
      (dataset) =>
        selectedIndustry === "" ||
        selectedIndustry === "All" ||
        dataset.industry === selectedIndustry
    )
    .filter(
      (dataset) =>
        search === "" ||
        dataset.name.toLowerCase().includes(search.toLowerCase()) ||
        dataset.source.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <AppTitle title="Data Marketplace" />
      <div className="p-4">
        <div className="mb-8">
          <input
            className="w-full p-2 border rounded"
            type="search"
            placeholder="Search for public datasets you would like to connect and use"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mb-8">
          <MarketplaceFilters
            industries={industries}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
          />
        </div>
        {filteredDatasets.filter((d) => d.connected).length > 0 && (
          <div>
            <h2 className="text-xl font-semibold my-4">Active data sets</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDatasets
                .filter((d) => d.connected)
                .map((dataset) => (
                  <DatasetCard key={dataset.id} dataset={dataset} />
                ))}
            </div>
          </div>
        )}
        {filteredDatasets.filter((d) => !d.connected).length > 0 && (
          <div>
            <h2 className="text-xl font-semibold my-4">Browse data sets</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDatasets
                .filter((d) => !d.connected)
                .map((dataset) => (
                  <DatasetCard key={dataset.id} dataset={dataset} />
                ))}
            </div>
          </div>
        )}
        {filteredDatasets.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            No data sets found
          </div>
        )}
      </div>
    </>
  );
}
