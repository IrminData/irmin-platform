import Link from 'next/link';
import Image from 'next/image';

export default function WebsiteError() {
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
                <span className='mb-4 inline-block rounded-full bg-ash_gray px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
                  Error 404
                </span>
                <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter md:text-5xl'>
                  Oh no! Error 404
                </h2>
                <p className='mb-6 text-lg text-rich_black md:text-xl'>
                  Something went wrong, so this page is broken.
                </p>
                <div className='flex flex-wrap'>
                  <div className='w-full py-1 lg:mr-6 lg:w-auto lg:py-0'>
                    <Link
                      className='inline-block w-full rounded-full border border-ash_gray-500 bg-ash_gray-500 px-7 py-5 text-center text-base font-medium leading-4 text-white shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 md:text-lg'
                      href='/'
                    >
                      Go back to Homepage
                    </Link>
                  </div>
                  <div className='w-full py-1 lg:w-auto lg:py-0'>
                    <Link
                      className='inline-block w-full rounded-full border border-rich_black bg-white px-7 py-5 text-center text-base font-medium leading-4 text-rich_black shadow-sm focus:ring-rich_black focus:ring-opacity-50 md:text-lg'
                      href='#'
                    >
                      Try Again
                    </Link>
                  </div>
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
