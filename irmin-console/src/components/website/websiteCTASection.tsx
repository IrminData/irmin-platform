import Link from 'next/link';
import Image from 'next/image';

export default function WebsiteCTASection() {
  return (
    <section
      className='overflow-hidden bg-white py-24'
      style={{
        backgroundImage: 'url("ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto px-4'>
        <div className='-mx-4 flex flex-wrap'>
          <div className='mb-20 w-full px-4 md:w-1/2 lg:mb-0'>
            <div className='max-w-md'>
              <h2 className='font-heading md:leading-15 mb-8 text-4xl font-bold text-rich_black md:text-5xl'>
                Join 6,000+ companies growing with Irmin
              </h2>
              <ul className='mb-8'>
                <li className='mb-4 flex items-center'>
                  <Image
                    className='mr-3'
                    src='/ui-assets/elements/checkbox-green.svg'
                    alt='Green checkbox'
                    width={26}
                    height={26}
                  />
                  <span className='font-heading text-lg text-rich_black md:text-xl'>
                    Mauris pellentesque congue libero nec
                  </span>
                </li>
                <li className='mb-4 flex items-center'>
                  <Image
                    className='mr-3'
                    src='/ui-assets/elements/checkbox-green.svg'
                    alt='Green checkbox'
                    width={26}
                    height={26}
                  />
                  <span className='font-heading text-lg text-rich_black md:text-xl'>
                    Suspendisse mollis tincidunt
                  </span>
                </li>
                <li className='flex items-center'>
                  <Image
                    className='mr-3'
                    src='/ui-assets/elements/checkbox-green.svg'
                    alt='Green checkbox'
                    width={26}
                    height={26}
                  />
                  <span className='font-heading text-lg text-rich_black md:text-xl'>
                    Praesent varius justo vel justo pulvinar
                  </span>
                </li>
              </ul>
              <div className='flex flex-wrap items-center'>
                <div className='w-1/2 pr-4'>
                  <Link
                    className='inline-block w-full rounded-full border border-midnight_green-500 bg-midnight_green-500 px-4 py-4 text-center text-base font-light leading-4 text-white shadow-sm transition-colors duration-200 ease-in-out hover:border-midnight_green-600 hover:bg-midnight_green-600 md:text-lg'
                    href='/sign-up'
                  >
                    Get started for free
                  </Link>
                </div>
                <div className='w-1/2'>
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
          <div className='w-full px-4 md:w-1/2'>
            <div className='relative mx-auto max-w-max'>
              <Image
                className='absolute right-0 top-0 z-10 -mr-6 -mt-6 w-20 lg:-mr-12 lg:-mt-12 lg:w-auto'
                src='/ui-assets/elements/circle3-yellow.svg'
                alt='Yellow circle'
                width={129}
                height={129}
              />
              <Image
                className='lg:-mb-10-ml-6 absolute bottom-0 left-0 -mb-6 w-20 lg:-ml-12 lg:w-auto'
                src='/ui-assets/elements/dots3-blue.svg'
                alt='Blue dots'
                width={129}
                height={129}
              />
              <Image
                className='relative'
                src='/ui-assets/elements/photo-laptop-ph.png'
                alt='Stock photo'
                width={554}
                height={415}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
