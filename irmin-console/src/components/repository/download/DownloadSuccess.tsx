'use client';

import { AiOutlineCheckCircle } from 'react-icons/ai';

import { useLocale } from '@/context/LocaleContext';

const DownloadSuccess = () => {
  const { dict } = useLocale();
  return (
    <div className='flex flex-col items-center justify-center gap-4 py-12'>
      <AiOutlineCheckCircle className='text-irmin_green' size={60} />
      <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
        {dict.common.success}
      </h2>
    </div>
  );
};

export default DownloadSuccess;
