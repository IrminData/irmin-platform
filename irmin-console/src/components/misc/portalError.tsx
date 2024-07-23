'use client';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useLocale();
  return (
    <div className='container relative z-10 mx-auto px-4 py-16 text-center'>
      <div className='py-16'>
        <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
          {dict.misc.error}
        </span>
        <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter md:text-5xl'>
          {dict.misc.ohNo} {dict.misc.somethingWentWrong}
        </h2>
        <p className='mb-6 text-lg text-irmin_black md:text-xl'>
          {dict.misc.weEncounteredError} {error.message}.{' '}
          {dict.misc.tryAgainOrContactSupport}
        </p>
        <div className='flex justify-center'>
          <div className='mx-2'>
            <Button
              variant='solid'
              colorScheme='primary'
              size='md'
              href='/portal'
            >
              {dict.misc.goBackPortal}
            </Button>
          </div>
          <div className='mx-2'>
            <Button
              variant='outline'
              colorScheme='secondary'
              size='md'
              onClick={reset}
            >
              {dict.misc.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortalError;
