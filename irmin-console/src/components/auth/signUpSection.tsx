'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthService from '@/lib/AuthService';
import { useProfile } from '@/context/ProfileContext';

const SignUpSection: React.FC = () => {
  const { fetchProfile } = useProfile();
  const router = useRouter();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Make sure terms are accepted
    const acceptTerms = (
      document.querySelector('input[name="accept-terms"]') as HTMLInputElement
    ).checked;
    if (!acceptTerms) {
      setError('Please accept the terms of use and privacy policy');
      setLoading(false);
      return;
    }
    // Register user
    const authService = AuthService.getInstance();
    try {
      const response = await authService.register(
        name,
        company,
        email,
        emailConfirmation,
        password,
        passwordConfirmation
      );
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        await fetchProfile();
        // Redirect to dashboard or another page on successful login
        setTimeout(() => {
          router.push('/app');
        }, 300);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      setError(error?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className='relative bg-white pt-16 md:py-32'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto mb-16 px-4 md:mb-0'>
        <div className='w-full md:w-1/2 md:pr-4'>
          <div className='mx-auto max-w-sm'>
            <div className='mb-6 text-center'>
              <Link className='mb-6 inline-block' href='#'>
                <Image
                  className='h-16'
                  src='/irmin-logo.svg'
                  alt='Irmin logo'
                  width={400}
                  height={100}
                />
              </Link>
              <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                Join the data hub
              </h3>
              <p className='text-lg font-light text-rich_black'>
                Give your data a better home
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='name'
                >
                  Name *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='text'
                  id='name'
                  placeholder='Patryk'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='company'
                >
                  Company *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='text'
                  id='company'
                  placeholder='Acme Inc.'
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='email'
                >
                  Email *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='email'
                  id='email'
                  placeholder='name@acme.corp'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='emailConfirmation'
                >
                  Confirm Email *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='email'
                  id='emailConfirmation'
                  placeholder='name@acme.corp'
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  required
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='password'
                >
                  Password *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='password'
                  id='password'
                  placeholder='enter a strong password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-rich_black'
                  htmlFor='passwordConfirmation'
                >
                  Confirm Password *
                </label>
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='password'
                  id='passwordConfirmation'
                  placeholder='same password as above'
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                />
              </div>
              {error && <p className='mb-4 text-red-800'>{error}</p>}
              {success && <p className='mb-4 text-ash_gray'>{success}</p>}
              <div className='mb-6 flex flex-wrap items-center justify-between'>
                <div className='w-full md:w-1/2'>
                  <label className='relative inline-flex items-center'>
                    <input
                      className='form-checkbox'
                      name='accept-terms'
                      type='checkbox'
                    />
                    <span className='ml-2 text-xs font-light text-rich_black'>
                      Accept our{' '}
                      <Link
                        className='text-ash_gray-500 hover:text-ash_gray-600'
                        href='/legal/terms-of-use'
                        target='_blank'
                      >
                        terms of use
                      </Link>{' '}
                      and{' '}
                      <Link
                        className='text-ash_gray-500 hover:text-ash_gray-600'
                        href='/legal/privacy-policy'
                        target='_blank'
                      >
                        privacy policy
                      </Link>
                    </span>
                  </label>
                </div>
              </div>
              <button
                className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Signing Up...' : 'Sign Up'}
              </button>
              <p className='text-center'>
                <span className='text-xs font-light'>
                  Already have an account?{' '}
                </span>
                <Link
                  className='inline-block text-xs font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
                  href='/sign-in'
                >
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
        <div className='md:absolute md:right-0 md:top-0 md:h-full md:w-1/2 md:pl-4'>
          <div className='bg-rich_black-50 flex h-full items-center justify-center px-8 py-14'>
            <div className='mx-auto text-center md:max-w-xl'>
              <span className='relative z-10 mb-4 inline-block rounded-full bg-ash_gray-100 px-2 py-px text-xs font-light uppercase leading-5 text-ash_gray-500 shadow-sm'>
                Quotes
              </span>
              <div className='relative mb-16'>
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
                <h3 className='relative text-2xl font-light leading-tight text-rich_black md:text-3xl'>
                  Love the simplicity of the service and the prompt customer
                  support. We can’t imagine working without it.
                </h3>
              </div>
              <div className='relative text-center'>
                <Image
                  className='mx-auto mb-6 h-24 w-24 rounded-full'
                  src='/ui-assets/images/sign-up/avatar-men-sign-up.png'
                  alt="John Doe's avatar"
                  width={88}
                  height={88}
                />
                <h4 className='mb-2 text-lg font-semibold text-rich_black'>
                  John Doe
                </h4>
                <span className='mb-8 block text-lg text-rich_black'>
                  CEO &amp; Founder at Acme Inc.
                </span>
                <div className='flex items-center justify-center'>
                  <button className='mr-3 h-3 w-3 rounded-full bg-rich_black-100' />
                  <button className='mr-3 h-3 w-3 rounded-full bg-ash_gray-500' />
                  <button className='h-3 w-3 rounded-full bg-rich_black-100' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpSection;
