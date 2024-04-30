import React, { useState } from "react";
import { IoClose } from "react-icons/io5";

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
    description: string;
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
          <div className="bg-white p-6 rounded shadow-lg w-full md:w-3/4 lg:w-1/2">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-semibold">
                {dataset.name} - Details
              </h2>
              <button
                className="text-gray-800 hover:text-gray-600"
                onClick={() => setShowDetails(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              {/* Description */}
              <p className="py-4 border-b">{dataset.description ?? ""}</p>
              {/* Details */}
              <div className="flex justify-between">
                <span className="font-medium">Source:</span>
                <span>{dataset.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Price:</span>
                <span>${dataset.price}/month</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Industry:</span>
                <span>{dataset.industry}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="bg-ash_gray hover:bg-ash_gray-600 text-white py-2 px-4 rounded"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
