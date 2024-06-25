import Link from 'next/link';
import Image from 'next/image';

export default function WebsiteTeamSection() {
  return (
    <>
      <section
        className='bg-white py-24'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <div className='container mx-auto px-4'>
          <div className='-mx-4 mb-16 flex flex-wrap items-center justify-between'>
            <div className='mb-8 w-full px-4 md:mb-0 md:w-1/2'>
              <div className='max-w-md'>
                <span className='mb-4 inline-block rounded-full bg-ash_gray px-2 py-px text-xs font-medium uppercase leading-5 text-white'>
                  Team
                </span>
                <h3 className='mb-4 text-4xl font-bold tracking-tighter md:text-5xl'>
                  Meet our team
                </h3>
                <p className='text-lg font-light text-rich_black md:text-xl'>
                  Highly professional and capable of running your business
                  across all digital channels.
                </p>
              </div>
            </div>
            <div className='w-full px-4 md:w-auto'>
              <div className='flex flex-wrap justify-center'>
                <div className='w-full py-1 md:mr-4 md:w-auto md:py-0'>
                  <Link
                    className='inline-block w-full rounded-full border border-ash_gray-500 bg-ash_gray-500 px-7 py-5 text-center text-base font-medium leading-4 text-white shadow-sm hover:bg-ash_gray-600 md:text-lg'
                    href='#'
                  >
                    Open Positions
                  </Link>
                </div>
                <div className='w-full py-1 md:w-auto md:py-0'>
                  <Link
                    className='inline-block w-full rounded-full border border-rich_black bg-white px-7 py-5 text-center text-base font-medium leading-4 text-rich_black shadow-sm hover:bg-rich_black-100 focus:outline-none md:text-lg'
                    href='#'
                  >
                    About Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className='-mx-4 flex flex-wrap'>
            <div className='mb-12 w-full px-4 md:w-1/2 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee1.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Macauley Herring
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  CEO &amp; Founder
                </span>
              </div>
            </div>
            <div className='mb-12 w-full px-4 md:w-1/2 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee6.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Ivan Mathews
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  CTO
                </span>
              </div>
            </div>
            <div className='mb-12 w-full px-4 md:w-1/2 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee5.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Elen Benitez
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  CPO
                </span>
              </div>
            </div>
            <div className='mb-12 w-full px-4 md:w-1/2 lg:mb-0 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee4.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Macauley Herring
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  Customer Success
                </span>
              </div>
            </div>
            <div className='mb-12 w-full px-4 md:mb-0 md:w-1/2 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee3.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Alya Levine
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  Backend Developer
                </span>
              </div>
            </div>
            <div className='w-full px-4 md:w-1/2 lg:w-1/3'>
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src='/ui-assets/images/teams/photo-employee2.png'
                  alt='Employee photo'
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  Rose Hernandez
                </h3>
                <span className='text-lg font-medium text-ash_gray-500'>
                  iOS Developer
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
