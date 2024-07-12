'use client';

import React from 'react';

import { ExportDataType } from '@/components/export-sync-setup/exportSetupView';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

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
  const { dict } = useLocale();
  const handleSave = () => {
    // Save the export configuration
    console.log('Saving Export Configuration:', exportData);
    setIsOpen(false);
  };

  return (
    <div className='px-6 py-4'>
      <h4 className='mb-4 text-lg font-semibold'>{dict.export.create.title}</h4>
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700'>
          {dict.export.create.processName}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.export.create.processNamePlaceholder}
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
          {dict.export.create.syncIntervalLabel}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.export.create.syncIntervalPlaceholder}
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
          {dict.export.create.startSync}
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
          {dict.export.create.goBack}
        </Button>
      </div>
    </div>
  );
}
