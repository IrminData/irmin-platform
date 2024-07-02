'use client';

import React from 'react';

import { ExportDataType } from '@/components/export-sync-setup/exportSetupView';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

export default function ConfigureExport({
  exportData,
  setExportData,
  setCurrentStep,
  setIsOpen,
}: {
  exportData: ExportDataType;
  setExportData: React.Dispatch<React.SetStateAction<ExportDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const handleSave = () => {
    // Save the export configuration
    console.log('Saving Export Configuration:', exportData);
    setIsOpen(false);
  };

  return (
    <div className='px-6 py-4'>
      <h4 className='mb-4 text-lg font-semibold'>Configure Export</h4>
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700'>
          Process Name (unique)
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder='Enter a name for the export process'
          defaultValue={exportData.name}
          onChange={(e) =>
            setExportData((prevData) => ({
              ...prevData,
              name: e.target.value,
            }))
          }
        />
      </div>
      <div className='mb-6'>
        <label className='mb-2 block font-light text-irmin_black' htmlFor=''>
          Sync interval (cron expression or leave empty for manual sync)
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder='Enter cron expression (e.g. 0 0 * * *) or leave empty for manual sync'
          defaultValue={exportData.cron}
          onChange={(e) => {
            setExportData((prevData) => ({
              ...prevData,
              cron: e.target.value,
            }));
          }}
        />
      </div>
      {/* Add more configuration settings as needed */}
      <div className='mt-4 flex justify-end'>
        <Button
          variant='solid'
          colorScheme='primary'
          size='md'
          className='mb-6 inline-block w-full'
          ariaLabel='Start export sync'
          onClick={handleSave}
        >
          Start sync
        </Button>
        <Button
          variant='link'
          colorScheme='primary'
          size='sm'
          className='inline-block w-full'
          ariaLabel='Go back'
          onClick={(e) => {
            e.preventDefault();
            setCurrentStep((prevStep) => prevStep - 1);
          }}
        >
          Go back
        </Button>
      </div>
    </div>
  );
}
