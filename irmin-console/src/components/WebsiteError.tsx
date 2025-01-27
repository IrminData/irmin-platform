'use client';

import Image from 'next/image';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Error UI for the website
 */
export default function WebsiteError({
  pageNotFound,
  error,
  reset,
}: {
  pageNotFound?: boolean;
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  const { dict } = useLocale();
  return (
    <div id='website-error-section'>
      <Image
        className='w-full md:hidden'
        src='/ui-assets/elements/dog-error-side.png'
        alt='Dog image for error 404'
        width={600}
        height={700}
      />
      <Image
        className='absolute top-0 left-0 hidden h-full w-2/5 md:block md:object-cover'
        src='/ui-assets/elements/dog-error-side.png'
        alt='Dog image for error 404'
        width={600}
        height={700}
      />
      <div className='relative z-10 container mx-auto min-h-[80vh] px-4'>
        <div className='flex flex-wrap py-16 md:py-40 lg:py-72'>
          <div className='ml-auto w-full text-center md:w-1/2 md:text-left'>
            <div className='md:max-w-xl'>
              <span className='bg-irmin_green mb-4 inline-block rounded-full px-2 py-px text-xs leading-5 font-medium text-white shadow-xs'>
                {dict.common.error} {pageNotFound ? '404' : '500'}
              </span>
              <h2 className='font-display mb-8 text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl'>
                {dict.common.ohNo}{' '}
                {pageNotFound
                  ? dict.common.pageNotFound
                  : dict.common.somethingWentWrong}
              </h2>
              <p className='text-foreground mb-6 text-xs md:text-sm dark:text-gray-300'>
                {error?.message}
              </p>
              <div className='flex flex-wrap gap-2'>
                <div className='w-[calc(50%-4px)]'>
                  <Button variant='default' className='w-full' href='/'>
                    {dict.common.goBackHome}
                  </Button>
                </div>
                {!pageNotFound && reset && (
                  <div className='w-[calc(50%-4px)]'>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={reset}
                    >
                      {dict.common.tryAgain}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Image
        className='absolute top-6 right-6 hidden w-24 md:block md:w-auto'
        src='/ui-assets/elements/dots3-green.svg'
        alt='Green dots'
        width={149}
        height={91}
      />
      <Image
        className='absolute right-0 bottom-0 w-24 md:w-auto'
        src='/ui-assets/elements/wave3-red.svg'
        alt='Red wave'
        width={160}
        height={160}
      />
    </div>
  );
}
