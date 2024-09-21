import { useState } from 'react';

import Select from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

export default function CreateBranchModalContent({
  branches,
  createBranch,
}: {
  branches: string[];
  createBranch: (branchName: string, fromBranch: string) => void;
}) {
  const { dict } = useLocale();

  const [branchName, setBranchName] = useState('');
  const [fromBranch, setFromBranch] = useState('main');

  return (
    <div className='mb-4 flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <label htmlFor='branchName' className='text-xs'>
          {dict.repository.newBranchName}
        </label>
        <Input
          id='branchName'
          type='text'
          value={branchName}
          variant='outline'
          colorScheme='gray'
          size='sm'
          onChange={(e) => setBranchName(e.target.value)}
          placeholder={dict.repository.newBranchName}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <label htmlFor='fromBranch' className='text-xs'>
          {dict.repository.fromBranch}
        </label>
        <Select
          options={branches.map((branch) => ({
            label: branch,
            value: branch,
          }))}
          value={{
            label: fromBranch,
            value: fromBranch,
          }}
          onChange={(selectedOption) => {
            if (selectedOption) {
              setFromBranch(selectedOption.value);
            }
          }}
          isSearchable
          placeholder={dict.repository.tabs.branches}
          noOptionsMessage={() => dict.misc.noOptionsMessage}
          className='react-select-container'
          classNamePrefix='react-select'
        />
      </div>
      <Button
        variant='solid'
        colorScheme='primary'
        size='sm'
        className='w-full'
        onClick={() => {
          createBranch(branchName, fromBranch);
        }}
      >
        {dict.repository.createBranch}
      </Button>
    </div>
  );
}
