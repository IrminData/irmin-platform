import Image from 'next/image';

import Button from '@/components/misc/Button';

export default function WebsiteFaqsSection() {
  return (
    <>
      <section
        className='bg-white pt-24'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <div className='container mx-auto max-w-7xl px-4'>
          <div className='mb-16 max-w-4xl'>
            <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
              FAQ
            </span>
            <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
              Frequently Asked Questions
            </h2>
            <p className='text-lg font-light text-irmin_black md:text-xl'>
              Flex is the only saas business platform that lets you run your
              business on one platform, seamlessly across all digital channels.
            </p>
          </div>
          <div className='-mx-4 flex flex-wrap pb-16'>
            <div className='mb-8 w-full px-4 md:w-1/2 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  What shipping options do you have?
                </h3>
                <p className='font-light text-irmin_black'>
                  For USA domestic orders we offer FedEx and USPS shipping.
                  Contact us via email to learn more.
                </p>
              </div>
            </div>
            <div className='mb-8 w-full px-4 md:w-1/2 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  What payment methods do you accept?
                </h3>
                <p className='font-light text-irmin_black'>
                  Any method of payments acceptable by you. For example: We
                  accept MasterCard, Visa.
                </p>
              </div>
            </div>
            <div className='mb-8 w-full px-4 md:w-1/2 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  How long does it take to ship my order?
                </h3>
                <p className='font-light text-irmin_black'>
                  Orders are usually shipped within 1-2 business days after
                  placing the order.
                </p>
              </div>
            </div>
            <div className='mb-8 w-full px-4 md:w-1/2 xl:mb-0 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  What shipping options do you have?
                </h3>
                <p className='font-light text-irmin_black'>
                  For USA domestic orders we offer FedEx and USPS shipping.
                  Contact us via email to learn more.
                </p>
              </div>
            </div>
            <div className='mb-8 w-full px-4 md:mb-0 md:w-1/2 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  What payment methods do you accept?
                </h3>
                <p className='font-light text-irmin_black'>
                  Any method of payments acceptable by you. For example: We
                  accept MasterCard, Visa.
                </p>
              </div>
            </div>
            <div className='w-full px-4 md:w-1/2 xl:w-1/3'>
              <div className='md:max-w-xs'>
                <div className='mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500'>
                  <Image
                    src='/ui-assets/elements/shield-icon.svg'
                    alt='shield icon'
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className='mb-6 text-xl font-bold text-irmin_black'>
                  How long does it take to ship my order?
                </h3>
                <p className='font-light text-irmin_black'>
                  Orders are usually shipped within 1-2 business days after
                  placing the order.
                </p>
              </div>
            </div>
          </div>
          <div
            className='relative -mb-40 overflow-hidden rounded-xl bg-irmin_black px-4 py-16 md:px-8 lg:px-16'
            style={{
              backgroundImage: 'url("/ui-assets/elements/pattern-dark.svg")',
              backgroundPosition: 'center',
            }}
          >
            <div className='relative mx-auto max-w-max text-center'>
              <h3 className='mb-2 text-2xl font-bold leading-tight tracking-tighter text-irmin_green md:text-5xl'>
                Have any additional questions?
              </h3>
              <p className='mb-6 text-base text-white md:text-xl'>
                Flex is a Small SaaS Business. We are here to help you grow your
                business.
              </p>
              <Button
                size='md'
                variant='solid'
                colorScheme='primary'
                className='mb-2 w-full rounded-full'
                ariaLabel='Get in touch'
                href='/contact'
              >
                Get in touch
              </Button>
            </div>
          </div>
        </div>
        <div className='bg-irmin_black-50 h-64' />
      </section>
    </>
  );
}
