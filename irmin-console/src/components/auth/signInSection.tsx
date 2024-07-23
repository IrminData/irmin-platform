'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import AuthService from '@/lib/api/AuthService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';
import { useProfile } from '@/context/ProfileContext';

const SignInSection: React.FC = () => {
  const { dict, locale } = useLocale();
  const { fetchProfile } = useProfile();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const authService = AuthService.getInstance(locale);
    try {
      const response = await authService.login(email, password);
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        await fetchProfile();
        // Redirect to portal on success
        router.push('/portal');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className='relative bg-white py-16 md:py-28'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
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
                variant='outline'
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
                variant='outline'
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
                <label className='relative inline-flex items-center'>
                  <input
                    className='form-checkbox'
                    type='checkbox'
                    name='remember-me'
                    defaultChecked
                  />
                  <span className='ml-2 text-xs font-light text-irmin_black'>
                    {dict.auth.signIn.rememberMe}
                  </span>
                </label>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Button variant='link' href='/forgot-password' size='sm'>
                  {dict.auth.signIn.forgotPassword}
                </Button>
              </div>
            </div>
            <Button
              className='mb-6 w-full'
              variant='solid'
              size='md'
              disabled={loading}
              loading={loading}
              type='submit'
            >
              {dict.auth.signIn.signIn}
            </Button>
            <p className='text-center'>
              <span className='text-xs font-light'>
                {dict.auth.signIn.dontHaveAccount}{' '}
              </span>
              <Button variant='link' href='/sign-up' size='sm'>
                {dict.auth.signIn.signUp}
              </Button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInSection;
