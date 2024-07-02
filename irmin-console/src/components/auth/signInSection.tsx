'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import AuthService from '@/lib/api/AuthService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useProfile } from '@/context/ProfileContext';

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
        router.push('/app');
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
              Sign in to your account
            </h3>
            <p className='text-lg font-light text-irmin_black'>
              Welcome back to the home of your data
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='mb-6'>
              <label
                className='mb-2 block font-light text-irmin_black'
                htmlFor='email'
              >
                Email
              </label>
              <Input
                variant='outline'
                colorScheme='black'
                size='md'
                type='email'
                id='email'
                placeholder='name@acme.corp'
                defaultValue={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                ariaLabel='Insert your email address here'
                className='w-full'
              />
            </div>
            <div className='mb-4'>
              <label
                className='mb-2 block font-light text-irmin_black'
                htmlFor='password'
              >
                Password
              </label>
              <Input
                variant='outline'
                colorScheme='black'
                size='md'
                required
                className='w-full'
                ariaLabel='Insert your password here'
                type='password'
                id='password'
                placeholder='your super secret password'
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
                    Remember me
                  </span>
                </label>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Button variant='link' href='/forgot-password' size='sm'>
                  Forgot your password?
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
              Sign In
            </Button>
            <p className='text-center'>
              <span className='text-xs font-light'>
                Don&apos;t have an account?{' '}
              </span>
              <Button variant='link' href='/sign-up' size='sm'>
                Sign up
              </Button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInSection;
