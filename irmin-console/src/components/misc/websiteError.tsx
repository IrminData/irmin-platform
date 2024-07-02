import Image from 'next/image';

import Button from '@/components/misc/Button';

export default function WebsiteError({
  pageNotFound,
  error,
  reset,
}: {
  pageNotFound?: boolean;
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  return (
    <>
      <section
        className='relative bg-white'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
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
        <div className='container relative z-10 mx-auto px-4'>
          <div className='flex flex-wrap py-16 md:py-40 lg:py-72'>
            <div className='ml-auto w-full text-center md:w-1/2 md:text-left'>
              <div className='md:max-w-xl'>
                <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
                  Error {pageNotFound ? '404' : '500'}
                </span>
                <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter md:text-5xl'>
                  Oh no!{' '}
                  {pageNotFound ? 'Page not found' : 'Something went wrong'}
                </h2>
                <p className='mb-6 text-lg text-irmin_black md:text-xl'>
                  {error?.message}
                </p>
                <div className='flex flex-wrap'>
                  <div className='w-full py-1 lg:mr-6 lg:w-auto lg:py-0'>
                    <Button
                      variant='solid'
                      colorScheme='primary'
                      ariaLabel='Go back to Homepage'
                      size='md'
                      className='inline-block w-full'
                      href='/'
                    >
                      Go back to Homepage
                    </Button>
                  </div>
                  {!pageNotFound && reset && (
                    <div className='w-full py-1 lg:w-auto lg:py-0'>
                      <Button
                        variant='outline'
                        colorScheme='secondary'
                        ariaLabel='Try Again'
                        size='md'
                        className='inline-block w-full'
                        onClick={reset}
                      >
                        Try Again
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
      </section>
    </>
  );
}
