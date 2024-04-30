import React, { useState } from "react";

export default function MarketplaceListingCard({
  dataset,
}: {
  dataset: {
    id: number;
    name: string;
    source: string;
    price: number;
    connected: boolean;
    industry: string;
  };
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border rounded shadow hover:shadow-lg transition duration-300 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-800 font-medium">{dataset.name}</span>
        {dataset.connected ? (
          <span className="text-ash_gray">
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
        <div>
          <button
            className="text-ash_gray hover:text-ash_gray-700 rounded mr-4"
            onClick={() => setShowDetails(true)}
          >
            Details
          </button>
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
      {showDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50 p-20">
          <div className="bg-white p-6 rounded shadow-lg w-full xl:w-1/2">
            <h2 className="text-lg font-semibold mb-4">{dataset.name}</h2>
            <p className="text-gray-700 mb-2">
              <strong>Source:</strong> {dataset.source}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Price:</strong> ${dataset.price}/month
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Industry:</strong> {dataset.industry}
            </p>
            <button
              className="bg-ash_gray hover:bg-ash_gray-600 text-white py-2 px-4 rounded"
              onClick={() => setShowDetails(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
