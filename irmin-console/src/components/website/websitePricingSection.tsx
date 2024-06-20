import Link from 'next/link';
import Image from 'next/image';

export default function WebsitePricingSection() {
  return (
    <>
      <section
        className='bg-white py-20 xl:py-24'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <div className='container mx-auto px-4'>
          <div className='text-center'>
            <span className='mb-4 inline-block rounded-full bg-midnight_green px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
              Pricing
            </span>
            <h3 className='mb-6 text-3xl font-bold tracking-tighter text-rich_black md:text-5xl'>
              Flexible pricing plan for your startup
            </h3>
            <div className='mb-12 flex w-full items-center justify-center'>
              <Link
                className='mr-4 inline-block text-lg font-light text-rich_black md:text-xl'
                href='#'
              >
                Billed Monthly
              </Link>
              <label
                className='flex cursor-pointer items-center rounded-full shadow-lg'
                htmlFor='toggle'
              >
                <div className='relative'>
                  <input className='sr-only' id='toggleB' type='checkbox' />
                  <div className='block h-9 w-20 rounded-full bg-ash_gray-500' />
                  <div className='dot absolute right-1 top-1 h-7 w-7 rounded-full bg-white shadow-lg' />
                </div>
              </label>
              <Link
                className='ml-4 inline-block text-lg font-light text-rich_black md:text-xl'
                href='#'
              >
                Billed Annually
              </Link>
            </div>
          </div>
          <div className='-mx-4 flex flex-wrap justify-center'>
            <div className='w-full p-4 md:w-1/2 lg:w-1/3'>
              <div className='flex h-full flex-col rounded-xl bg-green-50 pb-8 pt-8 shadow-md transition duration-500 hover:scale-105'>
                <div className='px-8 text-center'>
                  <h3 className='mb-2 text-3xl font-semibold tracking-tighter text-rich_black md:text-4xl'>
                    Small
                  </h3>
                  <p className='mb-6 font-light text-rich_black'>
                    For Individual Users
                  </p>
                  <div className='mb-6'>
                    <span className='relative -top-10 right-1 text-3xl font-bold text-rich_black'>
                      $
                    </span>
                    <span className='text-6xl font-semibold tracking-tighter text-rich_black md:text-7xl'>
                      10
                    </span>
                    <span className='ml-1 inline-block font-semibold text-rich_black'>
                      /mo
                    </span>
                  </div>
                  <Link
                    className='mb-8 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-4 text-center text-base font-light leading-6 text-green-50 shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 md:text-lg'
                    href='#'
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className='self-start px-8'>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className='flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full p-4 md:w-1/2 lg:w-1/3'>
              <div className='flex h-full flex-col rounded-xl bg-green-50 pb-8 pt-8 shadow-md transition duration-500 hover:scale-105'>
                <div className='px-8 text-center'>
                  <h3 className='mb-2 text-3xl font-semibold tracking-tighter text-rich_black md:text-4xl'>
                    Medium
                  </h3>
                  <p className='mb-6 font-light text-rich_black'>
                    For bigger teams
                  </p>
                  <div className='mb-6'>
                    <span className='relative -top-10 right-1 text-3xl font-bold text-rich_black'>
                      $
                    </span>
                    <span className='text-6xl font-semibold tracking-tighter text-rich_black md:text-7xl'>
                      99
                    </span>
                    <span className='ml-1 inline-block font-semibold text-rich_black'>
                      /mo
                    </span>
                  </div>
                  <Link
                    className='mb-8 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-4 text-center text-base font-light leading-6 text-green-50 shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 md:text-lg'
                    href='#'
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className='self-start px-8'>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                  <li className='flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full p-4 md:w-1/2 lg:w-1/3'>
              <div className='flex h-full flex-col rounded-xl bg-green-50 pb-8 pt-8 shadow-md transition duration-500 hover:scale-105'>
                <div className='px-8 text-center'>
                  <h3 className='mb-2 text-3xl font-semibold tracking-tighter text-rich_black md:text-4xl'>
                    Large
                  </h3>
                  <p className='mb-6 font-light text-rich_black'>
                    Unlimited possibilities
                  </p>
                  <div className='mb-6'>
                    <span className='relative -top-10 right-1 text-3xl font-bold text-rich_black'>
                      $
                    </span>
                    <span className='text-6xl font-semibold tracking-tighter text-rich_black md:text-7xl'>
                      799
                    </span>
                    <span className='ml-1 inline-block font-semibold text-rich_black'>
                      /mo
                    </span>
                  </div>
                  <Link
                    className='mb-8 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-4 text-center text-base font-light leading-6 text-green-50 shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 md:text-lg'
                    href='#'
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className='self-start px-8'>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className='mb-4 flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className='flex items-center font-light text-rich_black'>
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
