'use client';

import React from 'react';

export default function ConfigureReverseETL({
  reverseETLData,
  setReverseETLData,
  setCurrentStep,
  setIsOpen,
}: {
  reverseETLData: any;
  setReverseETLData: React.Dispatch<React.SetStateAction<any>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const handleSave = () => {
    // Save the reverse ETL configuration
    console.log('Saving Reverse ETL Configuration:', reverseETLData);
    setIsOpen(false);
  };

  return (
    <div className='px-6 py-4'>
      <h4 className='mb-4 text-lg font-semibold'>Configure Reverse ETL</h4>
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700'>
          Process Name
        </label>
        <input
          type='text'
          value={reverseETLData.name}
          onChange={(e) =>
            setReverseETLData((prevData: any) => ({
              ...prevData,
              name: e.target.value,
            }))
          }
          className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none sm:text-sm'
        />
      </div>
      <div className='mb-6'>
        <label className='mb-2 block font-light text-rich_black' htmlFor=''>
          Sync interval (cron expression)
        </label>
        <input
          className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
          defaultValue={reverseETLData.cron}
          onChange={(e) => {
            setReverseETLData((prevData: any) => ({
              ...prevData,
              cron: e.target.value,
            }));
          }}
        />
      </div>
      {/* Add more configuration settings as needed */}
      <div className='mt-4 flex justify-end'>
        <button
          className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
          onClick={handleSave}
        >
          Start sync
        </button>
        <button
          className='w-full text-center text-sm font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
          onClick={(e) => {
            e.preventDefault();
            setCurrentStep(2);
          }}
        >
          Go back
        </button>
      </div>
    </div>
  );
}
