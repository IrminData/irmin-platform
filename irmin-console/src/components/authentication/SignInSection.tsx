'use client';

import React, { useState } from 'react';

import { useTheme } from 'next-themes';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Sign in UI component
 *
 * @remarks
 *
 * UI for the sign in form. It allows users to sign in to the application.
 * It uses the {@link useIAM} hook to interact with the user's identity and APIs.
 */
const SignInSection = () => {
  const { theme } = useTheme();
  const { dict } = useLocale();
  const { login } = useIAM();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    await login(email, password, setSuccess, setError);
    setLoading(false);
  };

  return (
    <WebsiteSectionWrapper id='sign-in-section'>
      <div className='container mx-auto max-w-7xl px-4 py-16 md:py-28'>
        <div className='mx-auto max-w-sm'>
          <div className='mb-6 text-center'>
            <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
              {dict.auth.signIn.title}
            </h3>
            <p className='text-lg font-light text-irmin_black'>
              {dict.auth.signIn.subtitle}
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='mb-6'>
              <label
                className='mb-2 block font-light text-irmin_black'
                htmlFor='email'
              >
                {dict.auth.signIn.email}
              </label>
              <Input
                variant='solid'
                colorScheme='black'
                size='md'
                type='email'
                id='email'
                placeholder={dict.auth.signIn.emailPlaceholder}
                defaultValue={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                ariaLabel={dict.auth.signIn.email}
                className='w-full'
              />
            </div>
            <div className='mb-4'>
              <label
                className='mb-2 block font-light text-irmin_black'
                htmlFor='password'
              >
                {dict.auth.signIn.password}
              </label>
              <Input
                variant='solid'
                colorScheme='black'
                size='md'
                required
                className='w-full'
                ariaLabel={dict.auth.signIn.password}
                type='password'
                id='password'
                placeholder={dict.auth.signIn.passwordPlaceholder}
                defaultValue={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className='mb-4 text-red-800'>{error}</p>}
            {success && <p className='mb-4 text-irmin_green'>{success}</p>}
            <div className='mb-6 flex flex-wrap items-center justify-between'>
              <div className='w-full md:w-1/2'>
                <div className='flex items-center'>
                  <input
                    name='remember-me'
                    defaultChecked
                    type='checkbox'
                    value=''
                    className='h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500'
                  />
                  <label className='ms-2 text-sm font-light text-irmin_black'>
                    {dict.auth.signIn.rememberMe}
                  </label>
                </div>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Button
                  variant='link'
                  href='/forgot-password'
                  size='sm'
                  colorScheme='gray'
                >
                  {dict.auth.signIn.forgotPassword}
                </Button>
              </div>
            </div>
            <Button
              className='mb-6 w-full'
              variant='gradient'
              colorScheme='primary'
              size='md'
              disabled={loading}
              loading={loading}
              type='submit'
            >
              {dict.auth.signIn.signIn}
            </Button>
            <div className='flex w-full items-center justify-center'>
              <span className='text-sm font-light'>
                {dict.auth.signIn.dontHaveAccount}{' '}
              </span>
              <Button
                variant='link'
                href='/sign-up'
                size='md'
                colorScheme='secondary'
                className='my-0 py-0'
              >
                {dict.auth.signIn.signUp}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
};

export default SignInSection;
