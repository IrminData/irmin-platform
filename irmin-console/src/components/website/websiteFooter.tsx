import Link from 'next/link';
import Image from 'next/image';

export default function WebsiteFooter() {
  return (
    <>
      <section className='bg-rich_black'>
        <div className='container mx-auto'>
          <div className='flex flex-wrap pb-12 pt-24'>
            <div className='mb-16 w-full px-4 md:w-1/2 lg:mb-0 lg:w-4/12'>
              <Link className='mb-4 inline-block' href='#'>
                <Image
                  className='h-8'
                  src='/irmin-logo-light.svg'
                  alt='Irmin light color logo'
                  width={100}
                  height={25}
                />
              </Link>
              <p className='text-base font-light text-ash_gray lg:w-64'>
                A better home for your data. Irmin is an ETL and data management
                platform that helps you to collect, clean, and transform your
                data.
              </p>
              <div className='mt-10 flex flex-row'>
                <Link
                  className='mr-4 inline-block text-xs font-light text-ash_gray transition-colors duration-200 hover:text-white'
                  href='/legal/privacy-policy'
                >
                  Privacy Policy
                </Link>
                <Link
                  className='mr-4 inline-block text-xs font-light text-ash_gray transition-colors duration-200 hover:text-white'
                  href='/legal/terms-of-use'
                >
                  Terms of Use
                </Link>
              </div>
            </div>
            <div className='mb-16 w-full px-4 md:w-1/4 lg:mb-0 lg:w-2/12'>
              <h3 className='mb-5 text-lg font-bold text-white'>Product</h3>
              <ul>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Features
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Solutions
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Pricing
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Updates
                  </Link>
                </li>
              </ul>
            </div>
            <div className='mb-16 w-full px-4 md:w-1/4 lg:mb-0 lg:w-2/12'>
              <h3 className='mb-5 text-lg font-bold text-white'>Company</h3>
              <ul>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Blog
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Newsletter
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Help Centre
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Careers
                  </Link>
                </li>
                <li className='mb-4'>
                  <Link
                    className='inline-block text-base font-light text-ash_gray transition-colors duration-200 hover:text-white'
                    href='#'
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div className='w-full px-4 md:w-1/3 lg:w-4/12'>
              <h3 className='mb-5 text-lg font-bold text-white'>Newsletter</h3>
              <div className='flex flex-wrap'>
                <div className='w-full py-1 lg:mr-3 lg:flex-1 lg:py-0'>
                  <input
                    className='shadow-xsm h-12 w-full rounded-full border border-rich_black px-3 text-rich_black placeholder-rich_black outline-none'
                    placeholder='Your email'
                  />
                </div>
                <div className='w-full py-1 lg:w-auto lg:py-0'>
                  <Link
                    className='inline-block w-full rounded-full bg-ash_gray-500 px-5 py-4 text-center leading-4 text-white shadow-sm hover:bg-ash_gray-600'
                    href='#'
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <p className='py-10 text-center text-sm font-light text-ash_gray md:pb-16'>
            &copy; {new Date().getFullYear()} Irmin. All rights reserved.
          </p>
        </div>
      </section>
    </>
  );
}
