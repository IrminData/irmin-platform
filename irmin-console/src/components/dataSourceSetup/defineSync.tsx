"use client";

import { useState } from "react";
import Cron from "react-cron-generator";
import { connectionDataType } from "../dataSourceSetupView";

export default function DefineSync({
  connectors,
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: { name: string; icon: any; id: number }[];
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [cronValue, setCronValue] = useState(connectionData.cron);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connector
  );
  if (!connector) {
    setCurrentStep(1);
    return <></>;
  }

  const continueSetup = (e: React.MouseEvent) => {
    e.preventDefault();
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      cron: cronValue,
    }));
    alert("Connection setup done!");
  };

  return (
    <div className="p-6">
      <div className="flex mb-8 ">
        <connector.icon className="text-4xl mr-4 text-air_force_blue" />
        <span className="text-xl mt-1 text-air_force_blue">
          {connector.name}
        </span>
      </div>
      <div className="mb-6">
        <label className="block mb-2 text-rich_black font-light" htmlFor="">
          Sync interval (Quartz cron expression)
        </label>
        <input
          className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
          value={cronValue}
        />
      </div>
      <div className="py-4">
        <Cron
          value={cronValue}
          onChange={setCronValue}
          showResultText={true}
          showResultCron={false}
        />
      </div>
      <button
        className="inline-block py-3 px-7 mb-6 w-full text-base text-white font-medium text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
        onClick={continueSetup}
      >
        Start sync
      </button>
      <button
        className="text-sm w-full text-center font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline"
        onClick={(e) => {
          e.preventDefault();
          setCurrentStep(2);
        }}
      >
        Go back
      </button>
    </div>
  );
}
