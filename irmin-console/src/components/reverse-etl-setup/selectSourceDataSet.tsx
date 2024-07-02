'use client';

import React from 'react';

import { ReverseETLDataType } from '@/components/reverse-etl-setup/reverseETLSetupView';

export default function SelectSourceDataSet({
  dataSets,
  setReverseETLData,
  setCurrentStep,
}: {
  dataSets: { id: number; name: string }[];
  setReverseETLData: React.Dispatch<React.SetStateAction<ReverseETLDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleSelect = (id: number) => {
    setReverseETLData((prevData) => ({
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
