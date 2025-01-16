'use client';

import Image from 'next/image';

import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import { Badge } from '@/components/ui/badge';

/**
 * Sign Up UI component
 */
const SignUpSection = () => {
  const { resolvedTheme } = useTheme();

  return (
    <div
      id='sign-up-section'
      className='container mx-auto mb-16 flex max-w-7xl flex-wrap px-4 py-16 md:mb-0 md:py-28'
    >
      <div className='w-full md:w-1/2 md:pr-4'>
        <div className='mx-auto max-w-md'>
          <SignUp
            signInUrl='/sign-in'
            appearance={{
              baseTheme: resolvedTheme === 'dark' ? dark : undefined,
              variables: { colorPrimary: '#a3c2ac' },
            }}
          />
        </div>
      </div>
      <div className='w-full md:w-1/2 md:pl-4'>
        <div className='flex h-full items-center justify-center px-8 py-14'>
          <div className='mx-auto text-center md:max-w-xl'>
            <Badge>Quotes</Badge>
            <div className='relative mb-16 mt-4'>
              <Image
                className='absolute -top-10 left-0 2xl:-left-12'
                src='/ui-assets/elements/quotes-top.svg'
                alt='Quotes top'
                width={142}
                height={98}
              />
              <Image
                className='absolute -bottom-16 right-0'
                src='/ui-assets/elements/quotes-bottom.svg'
                alt='Quotes bottom'
                width={142}
                height={98}
              />
              <h3 className='relative text-xl font-normal leading-tight text-foreground md:text-3xl'>
                Love the simplicity of the service and the prompt customer
                support. We can&apos;t imagine working without it.
              </h3>
            </div>
            <div className='relative text-center'>
              <Image
                className='mx-auto mb-6 h-24 w-24 rounded-full'
                src='/ui-assets/elements/avatar-men-sign-up.png'
                alt="John Doe's avatar"
                width={88}
                height={88}
              />
              <h4 className='mb-2 text-lg font-semibold text-foreground'>
                John Doe
              </h4>
              <span className='mb-8 block text-lg text-foreground'>
                CEO &amp; Founder at Acme Inc.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpSection;
