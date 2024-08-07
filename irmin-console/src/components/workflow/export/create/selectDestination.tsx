'use client';

import React from 'react';

import { ExportSetup } from '@/types/internal/ExportSetup';

export default function SelectDestination({
  connections,
  setExportData,
  setCurrentStep,
}: {
  connections: { id: number; name: string }[];
  setExportData: React.Dispatch<React.SetStateAction<ExportSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleConnectionSelect = (id: number) => {
    setExportData((prevData) => ({
      ...prevData,
      connectionID: id,
    }));
    setCurrentStep(3);
  };

  return (
    <div className='px-6 py-4'>
      <ul>
        {connections.map((connection) => (
          <li
            key={connection.id}
            className='mb-2 cursor-pointer rounded bg-gray-100 p-2 hover:bg-gray-200'
            onClick={() => handleConnectionSelect(connection.id)}
          >
            {connection.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
