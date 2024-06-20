'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthService from '@/lib/AuthService';
import { useProfile } from '@/context/ProfileContext';
import { IoCheckbox } from 'react-icons/io5';

const SignInSection: React.FC = () => {
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
    const authService = AuthService.getInstance();
    try {
      const response = await authService.login(email, password);
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        await fetchProfile();
        // Redirect to dashboard or another page on successful login
        setTimeout(() => {
          router.push('/app');
        }, 300);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      setError(error?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className='bg-white py-24 md:py-32'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto px-4'>
        <div className='mx-auto max-w-sm'>
          <div className='mb-6 text-center'>
            <Link className='mb-6 inline-block' href='#'>
              <Image
                className='h-16'
                src='/irmin-logo.svg'
                alt='IRMIN logo'
                width={400}
                height={100}
              />
            </Link>
            <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
              Sign in to your account
            </h3>
            <p className='text-lg font-light text-rich_black'>
              Welcome back to the home of your data
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='mb-6'>
              <label
                className='mb-2 block font-light text-rich_black'
                htmlFor='email'
              >
                Email
              </label>
              <input
                className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
                type='email'
                id='email'
                placeholder='name@acme.corp'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='mb-4'>
              <label
                className='mb-2 block font-light text-rich_black'
                htmlFor='password'
              >
                Password
              </label>
              <input
                className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
                type='password'
                id='password'
                placeholder='your super secret password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className='mb-4 text-red-500'>{error}</p>}
            {success && <p className='mb-4 text-green-500'>{success}</p>}
            <div className='mb-6 flex flex-wrap items-center justify-between'>
              <div className='w-full md:w-1/2'>
                <label className='relative inline-flex items-center'>
                  <input
                    className='form-checkbox'
                    type='checkbox'
                    name='remember-me'
                    defaultChecked
                  />
                  <span className='ml-2 text-xs font-light text-rich_black'>
                    Remember me
                  </span>
                </label>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Link
                  className='inline-block text-xs font-light text-ash_gray-500 hover:text-ash_gray-600'
                  href='/forgot-password'
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
            <button
              className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
              type='submit'
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <p className='text-center'>
              <span className='text-xs font-light'>
                Don’t have an account?{' '}
              </span>
              <Link
                className='inline-block text-xs font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
                href='/sign-up'
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInSection;
