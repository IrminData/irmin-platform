import React from 'react';

import Image from 'next/image';

import { TbChevronDown } from 'react-icons/tb';

function DashboardTitleAndSelector({
  title,
  options,
  selected,
  onSelectionChange,
}: {
  title: string;
  options: string[];
  selected: string;
  onSelectionChange: (_selection: string) => void;
}) {
  return (
    <div className='flex items-center justify-between p-4 align-top'>
      <div className={`text-lg font-bold text-gray-800 md:text-3xl`}>
        <Image
          src='/irmin-logo.svg'
          alt='Irmin'
          width={120}
          height={120}
          className={`h-14 md:hidden`}
        />
        <h1>{title}</h1>
      </div>

      <div className='relative'>
        <select
          value={selected}
          onChange={(e) => onSelectionChange(e.target.value)}
          className='block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-8 leading-tight text-gray-700 focus:outline-none'
        >
          {options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700'>
          <TbChevronDown className='h-4 w-4' />
        </div>
      </div>
    </div>
  );
}

export default DashboardTitleAndSelector;
