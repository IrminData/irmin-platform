import Link from 'next/link';
import Image from 'next/image';

export default function WebsiteHeroSection() {
  return (
    <>
      <section className='overflow-hidden'>
        <div
          className='relative overflow-hidden bg-white'
          style={{
            backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
            backgroundPosition: 'center',
          }}
        >
          <div className='pb-28 pt-12 md:pb-72'>
            <div className='container mx-auto px-4'>
              <div className='mx-auto max-w-3xl text-center'>
                <span className='mb-4 inline-block rounded-full bg-midnight_green px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
                  Data hub
                </span>
                <h1 className='mb-6 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl'>
                  AI-powered <span className='text-ash_gray'>ETL platform</span>{' '}
                  with integrated{' '}
                  <span className='text-ash_gray'>data marketplace</span> for
                  analysts.
                </h1>
                <p className='mx-auto mb-8 max-w-3xl text-lg font-light text-rich_black md:text-xl'>
                  Streamline your data integration effortlessly with advanced
                  ETL, SQL transformations, and an AI Assistant. Enhance
                  decision-making using our rich data marketplace for access to
                  valuable data assets.
                </p>
                <div className='flex flex-wrap justify-center'>
                  <div className='w-full py-1 md:mr-4 md:w-auto md:py-0'>
                    <Link
                      className='inline-block w-full rounded-full border border-midnight_green-500 bg-midnight_green-500 px-7 py-5 text-center text-base font-light leading-4 text-white shadow-sm transition-colors duration-200 ease-in-out hover:border-midnight_green-600 hover:bg-midnight_green-600 md:text-lg'
                      href='/sign-up'
                    >
                      Get started for free
                    </Link>
                  </div>
                  <div className='w-full py-1 md:w-auto md:py-0'>
                    <Link
                      className='text-cente inline-block w-full rounded-full border border-ash_gray px-4 py-4 text-base font-light leading-4 text-ash_gray shadow-sm transition-colors duration-200 ease-in-out hover:bg-gray-50 md:text-lg'
                      href='#'
                    >
                      Schedule a live demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='container mx-auto -mt-32 px-4 py-20 md:-mt-72 md:pb-32'>
          <div className='relative mx-auto max-w-max'>
            <Image
              className='absolute -left-8 -top-8 z-20 w-28 md:w-auto'
              src='/ui-assets/elements/wave-green.svg'
              alt='Green wave'
              width={180}
              height={81}
            />
            <Image
              className='absolute -bottom-8 -right-8 w-28 md:w-auto'
              src='/ui-assets/elements/wave-yellow.svg'
              alt='Yellow wave'
              width={180}
              height={81}
            />
            <svg
              className='absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform cursor-pointer text-ash_gray-500 hover:text-ash_gray-600'
              width={64}
              height={64}
              viewBox='0 0 64 64'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <circle cx={32} cy={32} r={32} fill='currentColor' />
              <path
                className='text-white'
                d='M40.5 31.13L26.5 23.05C26.348 22.9622 26.1755 22.916 26 22.916C25.8245 22.916 25.652 22.9622 25.5 23.05C25.3474 23.1381 25.2208 23.265 25.133 23.4177C25.0452 23.5705 24.9993 23.7438 25 23.92V40.08C24.9993 40.2562 25.0452 40.4295 25.133 40.5822C25.2208 40.735 25.3474 40.8619 25.5 40.95C25.652 41.0378 25.8245 41.084 26 41.084C26.1755 41.084 26.348 41.0378 26.5 40.95L40.5 32.87C40.6539 32.7828 40.7819 32.6563 40.871 32.5035C40.96 32.3506 41.007 32.1769 41.007 32C41.007 31.8231 40.96 31.6494 40.871 31.4965C40.7819 31.3437 40.6539 31.2172 40.5 31.13ZM27 38.35V25.65L38 32L27 38.35Z'
                fill='currentColor'
              />
            </svg>
            <div className='relative overflow-hidden rounded-xl'>
              <Image
                src='/ui-assets/images/headers/placeholder-video2.png'
                alt='Video placeholder image'
                width={944}
                height={531}
              />
              <video
                className='absolute left-1/2 top-1/2 min-h-full min-w-full max-w-none -translate-x-1/2 -translate-y-1/2 transform'
                poster='/ui-assets/images/testimonials/video-frame.jpeg'
              >
                <source
                  src='https://static.shuffle.dev/files/video-placeholder.mp4'
                  type='video/mp4'
                />
              </video>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
