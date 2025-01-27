'use client';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Error UI for the console
 */
function ConsoleErrorSection({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict, locale } = useLocale();
  return (
    <div className='relative z-10 container mx-auto px-4 py-16 text-center'>
      <div className='py-16'>
        <span className='bg-irmin_green mb-4 inline-block rounded-full px-2 py-px text-xs leading-5 font-medium text-white shadow-xs'>
          {dict.common.error}
        </span>
        <h2 className='mb-4 text-4xl leading-tight font-bold tracking-tighter md:text-5xl'>
          {dict.common.ohNo} {dict.common.somethingWentWrong}
        </h2>
        <p className='text-foreground mb-6 text-lg md:text-xl'>
          {dict.common.weEncounteredError} {error.message}.{' '}
          {dict.common.tryAgainOrContactSupport}
        </p>
        <div className='flex justify-center'>
          <div className='mx-2'>
            <Button variant='default' href={`/${locale}/workspace`}>
              {dict.common.goBackConsole}
            </Button>
          </div>
          <div className='mx-2'>
            <Button variant='outline' onClick={reset}>
              {dict.common.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsoleErrorSection;
