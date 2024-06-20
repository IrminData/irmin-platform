import Image from 'next/image';

export default function WebsiteTestimonialsSection() {
  return (
    <>
      <section
        className='bg-white py-24 md:pb-28'
        style={{
          backgroundImage: 'url("ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <div className='container mx-auto px-4'>
          <div className='-mx-4 flex flex-wrap items-center justify-center lg:justify-between'>
            <div className='order-last w-auto px-4 lg:order-first'>
              <button className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 hover:bg-rich_black-100'>
                <svg
                  width={12}
                  height={14}
                  viewBox='0 0 12 14'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M10.9999 6H3.4099L6.7099 2.71C6.8982 2.5217 7.00399 2.2663 7.00399 2C7.00399 1.7337 6.8982 1.47831 6.7099 1.29C6.52159 1.1017 6.2662 0.995911 5.9999 0.995911C5.73359 0.995911 5.4782 1.1017 5.2899 1.29L0.289896 6.29C0.198856 6.38511 0.127491 6.49725 0.0798963 6.62C-0.0201217 6.86346 -0.0201217 7.13654 0.0798963 7.38C0.127491 7.50275 0.198856 7.6149 0.289896 7.71L5.2899 12.71C5.38286 12.8037 5.49346 12.8781 5.61532 12.9289C5.73718 12.9797 5.86788 13.0058 5.9999 13.0058C6.13191 13.0058 6.26261 12.9797 6.38447 12.9289C6.50633 12.8781 6.61693 12.8037 6.7099 12.71C6.80363 12.617 6.87802 12.5064 6.92879 12.3846C6.97956 12.2627 7.00569 12.132 7.00569 12C7.00569 11.868 6.97956 11.7373 6.92879 11.6154C6.87802 11.4936 6.80363 11.383 6.7099 11.29L3.4099 8H10.9999C11.2651 8 11.5195 7.89465 11.707 7.70711C11.8945 7.51957 11.9999 7.26522 11.9999 7C11.9999 6.73479 11.8945 6.48043 11.707 6.2929C11.5195 6.10536 11.2651 6 10.9999 6Z'
                    fill='#404F65'
                  />
                </svg>
              </button>
            </div>
            <div className='mb-12 w-full px-4 lg:mb-0 lg:w-2/6'>
              <div className='flex items-center'>
                <Image
                  className='mr-6 h-20 w-20 rounded-full md:h-24 md:w-24'
                  src='/ui-assets/images/testimonials/avatar1.png'
                  alt='Testimonial avatar'
                  width={88}
                  height={88}
                />
                <div>
                  <h3 className='mb-2 text-xl font-semibold md:text-2xl'>
                    Darren Dunlap
                  </h3>
                  <span className='text-lg font-light text-rich_black'>
                    CEO &amp; Founder at Acme Inc.
                  </span>
                </div>
              </div>
            </div>
            <div className='mb-12 w-full px-4 lg:mb-0 lg:w-2/6'>
              <div className='relative pb-6 pt-12 sm:p-6'>
                <Image
                  className='absolute left-0 top-0'
                  src='/ui-assets/elements/quote-top-green.svg'
                  alt='Green quote top'
                  width={142}
                  height={98}
                />
                <Image
                  className='absolute bottom-0 right-0'
                  src='/ui-assets/elements/quote-down-green.svg'
                  alt='Green quote down'
                  width={142}
                  height={98}
                />
                <div className='relative'>
                  <h2 className='text-2xl font-semibold tracking-tighter'>
                    The best solution for anyone who wants to work a flexible
                    schedule but still earn a full-time income.
                  </h2>
                </div>
              </div>
            </div>
            <div className='order-last w-auto px-4'>
              <button className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 hover:bg-rich_black-100'>
                <svg
                  width={12}
                  height={14}
                  viewBox='0 0 12 14'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M11.92 6.62C11.8724 6.49725 11.801 6.38511 11.71 6.29L6.71 1.29C6.61676 1.19676 6.50607 1.1228 6.38425 1.07234C6.26243 1.02188 6.13186 0.995911 6 0.995911C5.7337 0.995911 5.4783 1.1017 5.29 1.29C5.19676 1.38324 5.1228 1.49393 5.07234 1.61575C5.02188 1.73758 4.99591 1.86814 4.99591 2C4.99591 2.2663 5.1017 2.5217 5.29 2.71L8.59 6H1C0.734784 6 0.48043 6.10536 0.292893 6.2929C0.105357 6.48043 0 6.73479 0 7C0 7.26522 0.105357 7.51957 0.292893 7.70711C0.48043 7.89465 0.734784 8 1 8H8.59L5.29 11.29C5.19627 11.383 5.12188 11.4936 5.07111 11.6154C5.02034 11.7373 4.9942 11.868 4.9942 12C4.9942 12.132 5.02034 12.2627 5.07111 12.3846C5.12188 12.5064 5.19627 12.617 5.29 12.71C5.38296 12.8037 5.49356 12.8781 5.61542 12.9289C5.73728 12.9797 5.86799 13.0058 6 13.0058C6.13201 13.0058 6.26272 12.9797 6.38458 12.9289C6.50644 12.8781 6.61704 12.8037 6.71 12.71L11.71 7.71C11.801 7.6149 11.8724 7.50275 11.92 7.38C12.02 7.13654 12.02 6.86346 11.92 6.62Z'
                    fill='#404F65'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
