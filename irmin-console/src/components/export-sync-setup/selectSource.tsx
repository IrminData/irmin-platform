'use client';

import React from 'react';

import { ExportSetup } from '@/types/internal/ExportSetup';

export default function SelectSource({
  datasets,
  setExportData,
  setCurrentStep,
}: {
  datasets: { id: number; name: string }[];
  setExportData: React.Dispatch<React.SetStateAction<ExportSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleSelect = (id: number) => {
    setExportData((prevData) => ({
      ...prevData,
      connectionID: id,
    }));
    setCurrentStep(2);
  };

  return (
    <div className='px-6 py-4'>
      <ul>
        {datasets.map((dataset) => (
          <li
            key={dataset.id}
            className='mb-2 cursor-pointer rounded bg-gray-100 p-2 hover:bg-gray-200'
            onClick={() => handleSelect(dataset.id)}
          >
            {dataset.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
