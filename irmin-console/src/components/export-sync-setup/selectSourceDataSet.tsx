'use client';

import React from 'react';

import { ExportDataType } from '@/components/export-sync-setup/exportSetupView';

export default function SelectSourceDataSet({
  dataSets,
  setExportData,
  setCurrentStep,
}: {
  dataSets: { id: number; name: string }[];
  setExportData: React.Dispatch<React.SetStateAction<ExportDataType>>;
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
        {dataSets.map((dataSet) => (
          <li
            key={dataSet.id}
            className='mb-2 cursor-pointer rounded bg-gray-100 p-2 hover:bg-gray-200'
            onClick={() => handleSelect(dataSet.id)}
          >
            {dataSet.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
