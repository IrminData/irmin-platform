'use client';

import React from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

import { ExportSetup } from '@/types/internal/ExportSetup';

export default function ConfigureExport({
  exportData,
  setExportData,
  setCurrentStep,
  setIsOpen,
}: {
  exportData: ExportSetup;
  setExportData: React.Dispatch<React.SetStateAction<ExportSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { dict } = useLocale();
  const handleSave = () => {
    // TODO: Save the export configuration
    setIsOpen(false);
  };

  return (
    <div className='px-6 py-4'>
      <h4 className='mb-4 text-lg font-semibold'>
        {dict.workflow.export.create.title}
      </h4>
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700'>
          {dict.workflow.export.create.workflowName}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.workflow.export.create.workflowNamePlaceholder}
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
        <label className='mb-2 block font-normal text-irmin_black' htmlFor=''>
          {dict.workflow.export.create.syncIntervalLabel}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.workflow.export.create.syncIntervalPlaceholder}
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
          {dict.workflow.export.create.startWorkflow}
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
          {dict.workflow.export.create.goBack}
        </Button>
      </div>
    </div>
  );
}
