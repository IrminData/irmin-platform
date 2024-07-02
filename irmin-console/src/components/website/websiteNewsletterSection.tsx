import Image from 'next/image';
import Link from 'next/link';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

export default function WebsiteNewsletterSection() {
  return (
    <>
      <section
        className='relative bg-white py-24'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <Image
          className='absolute left-6 top-6 w-24 md:w-auto'
          src='/ui-assets/elements/dots3-violet.svg'
          alt='violet dots'
          width={149}
          height={91}
        />
        <Image
          className='absolute bottom-6 right-6 w-24 md:w-auto'
          src='/ui-assets/elements/dots3-blue.svg'
          alt='blue dots'
          width={149}
          height={91}
        />
        <div className='container relative z-10 mx-auto px-4'>
          <div className='mx-auto max-w-xl text-center'>
            <h3 className='mb-4 text-3xl font-bold leading-tight tracking-tighter text-irmin_black md:text-4xl'>
              Sign up for our newsletter
            </h3>
            <p className='mb-8 text-lg font-light text-irmin_black md:text-xl'>
              Stay in the loop with everything you need to know.
            </p>
            <div className='mx-auto text-left md:max-w-md'>
              <div className='mb-1 flex flex-wrap'>
                <div className='mb-3 w-full md:mb-0 md:mr-6 md:flex-1'>
                  <Input
                    size='md'
                    colorScheme='primary'
                    variant='outline'
                    placeholder='Enter your email'
                    type='email'
                  />
                </div>
                <div className='w-full md:w-auto'>
                  <Button
                    size='md'
                    variant='solid'
                    colorScheme='primary'
                    className='inline-block w-full'
                    ariaLabel='Subscribe to the Irmin newsletter'
                  >
                    Subscribe
                  </Button>
                </div>
              </div>
              <span className='text-xs font-light text-irmin_black'>
                <span>We care about your data in our</span>
                <Link
                  className='text-irmin_green-500 hover:text-irmin_green-600'
                  href='#'
                >
                  privacy policy
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
