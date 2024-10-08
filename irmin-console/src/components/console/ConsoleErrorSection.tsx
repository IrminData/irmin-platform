'use client';

import Button from '@/components/ui/Button';

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
    <div className='container relative z-10 mx-auto px-4 py-16 text-center'>
      <div className='py-16'>
        <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
          {dict.misc.error}
        </span>
        <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter md:text-5xl'>
          {dict.misc.ohNo} {dict.misc.somethingWentWrong}
        </h2>
        <p className='mb-6 text-lg text-foreground md:text-xl'>
          {dict.misc.weEncounteredError} {error.message}.{' '}
          {dict.misc.tryAgainOrContactSupport}
        </p>
        <div className='flex justify-center'>
          <div className='mx-2'>
            <Button
              variant='default'
              href={`/${locale}/console/manage-workspaces`}
            >
              {dict.misc.goBackConsole}
            </Button>
          </div>
          <div className='mx-2'>
            <Button variant='outline' onClick={reset}>
              {dict.misc.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsoleErrorSection;
