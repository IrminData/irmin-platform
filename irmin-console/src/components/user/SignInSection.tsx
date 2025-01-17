'use client';

import Image from 'next/image';
import Link from 'next/link';

import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useLocale } from '@/context/LocaleContext';

const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://irmin.dev';

/**
 * Sign In UI component
 */
const SignInSection = () => {
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();

  return (
    <div
      id='sign-in-section'
      className='mx-auto flex h-full flex-col justify-center gap-8 px-4 py-16 md:mb-0 md:py-28'
    >
      <div className='flex w-full flex-row justify-between gap-4 px-4'>
        <Link
          href={websiteUrl}
          className='transition-all hover:opacity-80'
          aria-label='Go to website'
        >
          <Image
            className='h-9 min-h-5 w-auto dark:hidden'
            src='/irmin-logo.svg'
            alt='Irmin logo'
            width={200}
            height={100}
          />
          <Image
            className='hidden h-9 min-h-5 w-auto dark:block'
            src='/irmin-logo-light.svg'
            alt='Irmin logo'
            width={200}
            height={100}
          />
        </Link>
        <div className='ml-auto'></div>
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>
      <SignIn
        signUpUrl={`/${locale}/sign-up`}
        appearance={{
          baseTheme: resolvedTheme === 'dark' ? dark : undefined,
          variables: { colorPrimary: '#a3c2ac' },
        }}
      />
    </div>
  );
};

export default SignInSection;
