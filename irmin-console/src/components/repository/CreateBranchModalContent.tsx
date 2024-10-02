'use client';

import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  branchName: string;
  fromBranch: string;
}

/**
 * Modal content to create a new branch.
 *
 * @param props - The props
 * @param props.branches - The list of existing branches to create the new branch from
 * @param props.createBranch - Callback to create a new branch
 */
export default function CreateBranchModalContent({
  branches,
  createBranch,
}: {
  branches: string[];
  createBranch: (branchName: string, fromBranch: string) => void;
}) {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      branchName: '',
      fromBranch: 'main',
    },
  });

  const onSubmit = (data: FormValues) => {
    createBranch(data.branchName, data.fromBranch);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-8'
    >
      <div className='flex flex-col gap-2'>
        <label htmlFor='branchName' className='text-xs'>
          {dict.repository.newBranchName}
        </label>
        <Controller
          name='branchName'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                id='branchName'
                type='text'
                variant='outline'
                colorScheme='gray'
                size='sm'
                placeholder={dict.repository.newBranchName}
                {...field}
              />
              {errors.branchName && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.branchName.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <label htmlFor='fromBranch' className='text-xs'>
          {dict.repository.fromBranch}
        </label>
        <Controller
          name='fromBranch'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Select
                options={branches.map((branch) => ({
                  label: branch,
                  value: branch,
                }))}
                value={{
                  label: field.value,
                  value: field.value,
                }}
                onChange={(selectedOption) => {
                  field.onChange(selectedOption?.value || 'main');
                }}
                isSearchable
                placeholder={dict.repository.tabs.branches}
                noOptionsMessage={() => dict.misc.noOptionsMessage}
                className='react-select-container'
                classNamePrefix='react-select'
              />
              {errors.fromBranch && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.fromBranch.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <Button
        variant='solid'
        colorScheme='primary'
        size='sm'
        className='w-full'
        type='submit'
      >
        {dict.repository.createBranch}
      </Button>
    </form>
  );
}
