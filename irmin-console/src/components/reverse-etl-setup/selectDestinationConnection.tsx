'use client';

import React from 'react';

export default function SelectDestinationConnection({
  connections,
  setReverseETLData,
  setCurrentStep,
}: {
  connections: { id: number; name: string }[];
  setReverseETLData: React.Dispatch<React.SetStateAction<any>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleConnectionSelect = (id: number) => {
    setReverseETLData((prevData: any) => ({
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
