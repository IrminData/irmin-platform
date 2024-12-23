'use client';

import { AiOutlineException } from 'react-icons/ai';

import { useLocale } from '@/context/LocaleContext';

const DownloadFailed = () => {
  const { dict } = useLocale();
  return (
    <div className='flex flex-col items-center justify-center gap-4 py-12'>
      <AiOutlineException className='text-red-600' size={60} />
      <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
        {dict.common.error}
      </h2>
    </div>
  );
};

export default DownloadFailed;
