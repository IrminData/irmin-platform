"use client";

import { connectionDataType } from "../dataSourceSetupView";

export function SelectConnector({
  connectors,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: { name: string; icon: any; id: number }[];
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleConnectorClick = (connectorID: number) => {
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      connector: connectorID,
    }));
    setCurrentStep(2);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 p-6">
        {connectors.map((connector, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center border p-4 rounded-lg hover:shadow-lg transition duration-300"
            onClick={() => handleConnectorClick(connector.id)}
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
    </>
  );
}
