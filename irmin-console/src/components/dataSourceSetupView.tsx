"use client";

import React, { useState } from "react";

import { AiFillGoogleCircle } from "react-icons/ai";
import { FiDatabase, FiLayers, FiFileText } from "react-icons/fi";
import {
  SiGoogleanalytics,
  SiFacebook,
  SiGoogleads,
  SiGooglesearchconsole,
  SiStripe,
  SiShopify,
  SiWoocommerce,
} from "react-icons/si";

import { SelectConnector } from "./dataSourceSetup/selectConnector";
import DefineConnectionDetails from "./dataSourceSetup/defineConnectionDetails";
import DefineConnectionSettings from "./dataSourceSetup/defineConnectionSettings";
import DefineSync from "./dataSourceSetup/defineSync";

export interface connectionDataType {
  connectionID: null | number;
  name: string;
  connector: null | number;
  connectionDetails: any;
  settings: any;
  cron: string;
}

const connectors = [
  { name: "SFTP", icon: FiFileText, id: 1 },
  { name: "FTP", icon: FiFileText, id: 2 },
  { name: "S3", icon: FiFileText, id: 3 },
  { name: "PostgreSQL", icon: FiDatabase, id: 4 },
  { name: "MySQL database", icon: FiDatabase, id: 5 },
  { name: "MongoDB database", icon: FiLayers, id: 6 },
  { name: "Facebook Ads", icon: SiFacebook, id: 7 },
  { name: "Google Analytics", icon: SiGoogleanalytics, id: 8 },
  { name: "Google AdSense", icon: SiGoogleads, id: 9 },
  { name: "Google Search Console", icon: SiGooglesearchconsole, id: 10 },
  { name: "Stripe", icon: SiStripe, id: 11 },
  { name: "Shopify", icon: SiShopify, id: 12 },
  { name: "WooCommerce", icon: SiWoocommerce, id: 13 },
  { name: "Google Drive", icon: AiFillGoogleCircle, id: 14 },
  { name: "Google Cloud Storage", icon: AiFillGoogleCircle, id: 15 },
  { name: "Google Cloud BigQuery", icon: AiFillGoogleCircle, id: 16 },
];

export default function DataSourceSetupView({
  setIsOpen,
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [connectionData, setConnectionData] = useState<connectionDataType>({
    connectionID: null,
    name: "",
    connector: null,
    connectionDetails: {},
    settings: {},
    cron: "1 0 * JAN *",
  });

  const steps = [
    "Select a connector",
    "Establish connection",
    "Connection settings",
    "Configure sync",
  ];

  return (
    <div className="overflow-y-scroll max-h-screen pt-28">
      <div className="flex justify-between items-center px-6 py-4 border-b h-14">
        <h3 className="text-xl font-semibold">Setup a connection</h3>
      </div>
      <div className="space-x-1 flex items-center px-6 py-4 justify-between">
        {steps.map((step, index) => (
          <div
            className={`flex items-center ${
              index === steps.length - 1 ? "" : "mr-0"
            }`}
            key={step}
          >
            <div
              className={`text-sm w-6 h-6 rounded-full text-white flex items-center justify-center mr-2 ${
                currentStep >= index + 1 ? "bg-ash_gray-500" : "bg-gray-300"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`text-xs ${
                currentStep >= index + 1 ? "text-ash_gray-500" : "text-gray-500"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      {currentStep === 1 && (
        <SelectConnector
          connectors={connectors}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <DefineConnectionDetails
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <DefineConnectionSettings
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && (
        <DefineSync
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
          setIsOpen={setIsOpen}
        />
      )}
    </div>
  );
}
