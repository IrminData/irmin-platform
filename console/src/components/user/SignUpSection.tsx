'use client';

import { useSyncExternalStore } from 'react';

import Link from 'next/link';

import { clientEnv } from '@/config/env.client';
import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import { Logo } from '@/components/Logo/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useLocale } from '@/context/LocaleContext';

const websiteUrl = clientEnv.NEXT_PUBLIC_WEBSITE_URL;

const noopSubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

/**
 * Sign Up UI component
 */
const SignUpSection = () => {
  const { resolvedTheme } = useTheme();
  const { locale } = useLocale();
  const mounted = useSyncExternalStore(noopSubscribe, getTrue, getFalse);

  return (
    <div
      id='sign-up-section'
      className={`
        mx-auto flex h-full flex-col justify-center gap-8 px-4 py-16
        md:mb-0 md:py-28
      `}
    >
      <div className='flex w-full flex-row justify-between gap-4 px-4'>
        <Link
          href={websiteUrl}
          className={`
            transition-opacity
            hover:opacity-80
          `}
          aria-label='Go to website'
        >
          <Logo
            className='
              text-[1.5rem]
              md:text-[1.6rem]
            '
          />
        </Link>
        <div className='ml-auto' />
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>
      {mounted && (
        <SignUp
          signInUrl={`/${locale}/sign-in`}
          appearance={{
            theme: resolvedTheme === 'dark' ? dark : undefined,
            variables: { colorPrimary: '#a3c2ac' },
          }}
        />
      )}
    </div>
  );
};

export default SignUpSection;
