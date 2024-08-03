'use client';

import React from 'react';

import { ExportSetup } from '@/types/internal/ExportSetup';

export default function SelectSource({
  dataRepositories,
  setExportData,
  setCurrentStep,
}: {
  dataRepositories: { id: number; name: string }[];
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
        {dataRepositories.map((dataRepo) => (
          <li
            key={dataRepo.id}
            className='mb-2 cursor-pointer rounded bg-gray-100 p-2 hover:bg-gray-200'
            onClick={() => handleSelect(dataRepo.id)}
          >
            {dataRepo.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
