'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import AuthService from '@/lib/AuthService';

const UserInviteSection: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = parseInt(searchParams.get('invite') || '-1', 10);

  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAcceptInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const authService = AuthService.getInstance();

    try {
      const response = await authService.acceptUserInvite(
        inviteId,
        company,
        password,
        passwordConfirmation
      );
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        // Redirect to dashboard or another page on successful accept
        setTimeout(() => {
          router.push('/app');
        }, 300);
      } else {
        throw new Error(response.message || 'Accepting invite failed');
      }
    } catch (error: any) {
      setError(error?.message ?? 'Accepting invite failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const authService = AuthService.getInstance();
    try {
      const response = await authService.declineUserInvite(inviteId);
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        // Redirect to homepage or another page on successful decline
        setTimeout(() => {
          router.push('/');
        }, 300);
      } else {
        throw new Error(response.message || 'Declining invite failed');
      }
    } catch (error: any) {
      setError(error?.message ?? 'Declining invite failed');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteId || inviteId === -1) {
    return (
      <section className='relative bg-white pt-16 md:py-32'>
        <div className='container mx-auto mb-16 px-4 md:mb-0'>
          <div className='w-full md:w-1/2 md:pr-4'>
            <div className='mx-auto max-w-sm'>
              <div className='mb-6 text-center'>
                <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                  Invalid Invitation
                </h3>
                <p className='text-lg font-light text-rich_black'>
                  The invitation link is invalid or expired.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='relative bg-white pt-16 md:py-32'>
      <div className='container mx-auto mb-16 px-4 md:mb-0'>
        <div className='w-full md:w-1/2 md:pr-4'>
          <div className='mx-auto max-w-sm'>
            <div className='mb-6 text-center'>
              <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                You&apos;ve been invited!
              </h3>
              <p className='text-lg font-light text-rich_black'>
                Accept or decline the invitation to join the workspace.
              </p>
            </div>
            {error && <p className='mb-4 text-red-800'>{error}</p>}
            {success && <p className='mb-4 text-ash_gray'>{success}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAcceptInvite();
              }}
            >
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
              <button
                className='hover:bg-ash-gray-600focus:outline-none hover:text-gray_200 mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm transition-all hover:bg-ash_gray-700'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Accepting Invite...' : 'Accept Invite'}
              </button>
            </form>
            <button
              className='focus:none mb-6 inline-block w-full rounded-full border-2 border-red-400 px-7 py-3 text-center text-base font-medium leading-6 text-red-400 shadow-sm transition-all hover:border-red-200 hover:text-red-200 focus:outline-none'
              onClick={handleDeclineInvite}
              disabled={loading}
            >
              {loading ? 'Declining Invite...' : 'Decline Invite'}
            </button>
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
                  support. We can&apos;t imagine working without it.
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

export default UserInviteSection;
