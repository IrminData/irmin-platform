"use client";

import { useRef } from "react";
import { connectionDataType } from "../dataSourceSetupView";

export default function DefineConnectionDetails({
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
  // TODO: Fetch the fields from /details

  const formRef = useRef<HTMLFormElement>(null);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connector
  );
  if (!connector) {
    setCurrentStep(1);
    return <></>;
  }

  const continueAndTestConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      connectionDetails: data,
    }));
    setCurrentStep(3);
  };

  return (
    <div className="p-6">
      <div className="flex mb-8 ">
        <connector.icon className="text-4xl mr-4 text-air_force_blue" />
        <span className="text-xl mt-1 text-air_force_blue">
          {connector.name}
        </span>
      </div>

      <form action="" ref={formRef}>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Connection name *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="name"
            placeholder="Connection name"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Host *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="host"
            placeholder="Host"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Port *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="port"
            placeholder="Port"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Database *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="database"
            placeholder="Database"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Username *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="username"
            placeholder="Username"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-rich_black font-light" htmlFor="">
            Password *
          </label>
          <input
            className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
            type="password"
            placeholder="Password"
            required
          />
        </div>
        <button
          className="inline-block py-3 px-7 mb-6 w-full text-base text-white font-medium text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
          onClick={continueAndTestConnection}
        >
          Continue & test connection
        </button>
        <button
          className="text-sm w-full text-center font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            setCurrentStep(1);
          }}
        >
          Go back
        </button>
      </form>
    </div>
  );
}
