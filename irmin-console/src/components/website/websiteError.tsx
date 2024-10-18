'use client';

import Image from 'next/image';

import Button from '@/components/ui/button';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

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
    <WebsiteSectionWrapper id='website-error-section'>
      <Image
        className='w-full md:hidden'
        src='/ui-assets/images/http-codes/dog-error-side.png'
        alt='Dog image for error 404'
        width={600}
        height={700}
      />
      <Image
        className='absolute left-0 top-0 hidden h-full w-2/5 md:block md:object-cover'
        src='/ui-assets/images/http-codes/dog-error-side.png'
        alt='Dog image for error 404'
        width={600}
        height={700}
      />
      <div className='container relative z-10 mx-auto min-h-[80vh] px-4'>
        <div className='flex flex-wrap py-16 md:py-40 lg:py-72'>
          <div className='ml-auto w-full text-center md:w-1/2 md:text-left'>
            <div className='md:max-w-xl'>
              <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
                {dict.misc.error} {pageNotFound ? '404' : '500'}
              </span>
              <h2 className='mb-8 font-display text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl'>
                {dict.misc.ohNo}{' '}
                {pageNotFound
                  ? dict.misc.pageNotFound
                  : dict.misc.somethingWentWrong}
              </h2>
              <p className='mb-6 text-xs text-foreground md:text-sm dark:text-gray-300'>
                {error?.message}
              </p>
              <div className='flex flex-wrap gap-2'>
                <div className='w-[calc(50%-4px)]'>
                  <Button variant='default' className='w-full' href='/'>
                    {dict.misc.goBackHome}
                  </Button>
                </div>
                {!pageNotFound && reset && (
                  <div className='w-[calc(50%-4px)]'>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={reset}
                    >
                      {dict.misc.tryAgain}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Image
        className='absolute right-6 top-6 hidden w-24 md:block md:w-auto'
        src='/ui-assets/elements/dots3-green.svg'
        alt='Green dots'
        width={149}
        height={91}
      />
      <Image
        className='absolute bottom-0 right-0 w-24 md:w-auto'
        src='/ui-assets/elements/wave3-red.svg'
        alt='Red wave'
        width={160}
        height={160}
      />
    </WebsiteSectionWrapper>
  );
}
