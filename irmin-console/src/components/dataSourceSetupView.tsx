import React, { useState } from "react";
import { AiFillGoogleCircle } from "react-icons/ai";
import { FiDatabase, FiBarChart2, FiLayers, FiFileText } from "react-icons/fi";
import {
  SiGoogleanalytics,
  SiFacebook,
  SiGoogleads,
  SiGooglesearchconsole,
  SiStripe,
  SiShopify,
  SiWoocommerce,
} from "react-icons/si";

const connectors = [
  { name: "SFTP", icon: FiFileText },
  { name: "FTP", icon: FiFileText },
  { name: "S3", icon: FiFileText },
  { name: "Azure Blob Storage", icon: FiFileText },
  { name: "PostgreSQL", icon: FiDatabase },
  { name: "MySQL database", icon: FiDatabase },
  { name: "PostgreSQL database", icon: FiBarChart2 },
  { name: "MongoDB database", icon: FiLayers },
  { name: "Google Analytics", icon: SiGoogleanalytics },
  { name: "Facebook Ads", icon: SiFacebook },
  { name: "Google AdSense", icon: SiGoogleads },
  { name: "Google Search Console", icon: SiGooglesearchconsole },
  { name: "Stripe", icon: SiStripe },
  { name: "Shopify", icon: SiShopify },
  { name: "WooCommerce", icon: SiWoocommerce },
  { name: "Google Sheets", icon: AiFillGoogleCircle },
  { name: "Google Drive", icon: AiFillGoogleCircle },
  { name: "Google Cloud Storage", icon: AiFillGoogleCircle },
  { name: "Google Cloud SQL", icon: AiFillGoogleCircle },
  { name: "Google Cloud BigQuery", icon: AiFillGoogleCircle },
  { name: "Google Cloud Firestore", icon: AiFillGoogleCircle },
];

const StepIndicator = ({
  step,
  isCurrent,
}: {
  step: string;
  isCurrent: boolean;
}) => (
  <div
    className={`w-1/5 px-2 py-1 text-center ${
      isCurrent ? "text-blue-500 font-bold" : "text-gray-400"
    }`}
  >
    {step}
  </div>
);

export default function DataSourceSetupView() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleConnectorClick = (connectorName: string) => {
    console.log("Connector selected:", connectorName);
    // Transition to the next step or handle the connector selection
  };

  const steps = [
    "Select a connector",
    "Establish connection",
    "Connection settings",
    "Data to sync",
    "Configure sync",
  ];

  return (
    <div className="overflow-y-scroll max-h-screen pt-28">
      <div className="flex justify-between items-center px-6 py-4 border-b h-14">
        <h3 className="text-xl font-semibold">Setup a data source</h3>
      </div>
      <div className="space-x-1 flex items-center p-4">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div
              className={`flex items-center ${
                index === steps.length - 1 ? "" : "mr-0"
              }`}
            >
              <div
                className={`text-sm w-6 h-6 rounded-full text-white flex items-center justify-center ${
                  currentStep >= index + 1 ? "bg-ash_gray-500" : "bg-gray-300"
                }`}
              >
                {index + 1}
              </div>
            </div>
            <span
              className={`text-xs ${
                currentStep >= index + 1 ? "text-ash_gray-500" : "text-gray-500"
              }`}
            >
              {step}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 p-6">
        {connectors.map((connector, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center border p-4 rounded-lg hover:shadow-lg transition duration-300"
            onClick={() => handleConnectorClick(connector.name)}
          >
            <connector.icon className="text-4xl mb-2" />
            <span className="text-sm">{connector.name}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center px-6 py-4 border-t">
        <button className="bg-ash_gray-500 text-white py-2 px-4 rounded hover:bg-ash_gray-600 transition duration-300">
          Add custom connector
        </button>
        <button className="text-ash_gray-500 hover:underline">
          Contact support
        </button>
      </div>
    </div>
  );
}
