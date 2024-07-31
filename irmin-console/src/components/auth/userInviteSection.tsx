'use client';

import React, { useState } from 'react';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import InviteService from '@/services/api/InviteService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

/**
 * User invite UI component
 *
 * @todo This component needs to be tested and fixed. Use Signed URLs. Seperate the logic from the UI.
 *
 * @remarks
 *
 * UI for user to accept or decline an invite to join a workspace.
 *
 * New users will be prompted to enter their company name, password and confirm password.
 * The API will handle user's registration if the invite is accepted.
 *
 * Existing users will be prompted to accept or decline the invite.
 *
 * @returns The user invite section component
 */
const UserInviteSection: React.FC = () => {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = parseInt(searchParams.get('invite') || '-1', 10);

  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inviteService = InviteService.getInstance(locale);

  const handleAcceptInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await inviteService.acceptInvite(
        inviteId,
        company,
        password,
        passwordConfirmation
      );
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        // Redirect to portal on success
        router.push('/portal');
      } else {
        throw new Error(response.message || 'Accepting invite failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Accepting invite failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await inviteService.declineInvite(inviteId);
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        // Redirect to homepage or another page on successful decline
        router.push('/');
      } else {
        throw new Error(response.message || 'Declining invite failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Declining invite failed');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteId || inviteId === -1) {
    return (
      <section className='relative bg-white pt-16 md:py-32'>
        <div className='container mx-auto mb-16 max-w-7xl px-4 md:mb-0'>
          <div className='w-full md:pr-4'>
            <div className='mx-auto max-w-sm'>
              <div className='mb-6 text-center'>
                <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                  {dict.auth.invite.invalid}
                </h3>
                <p className='text-lg font-light text-irmin_black'>
                  {dict.auth.invite.invalidMessage}
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
      <div className='container mx-auto mb-16 max-w-7xl px-4 md:mb-0'>
        <div className='w-full md:w-1/2 md:pr-4'>
          <div className='mx-auto max-w-sm'>
            <div className='mb-6 text-center'>
              <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                {dict.auth.invite.title}
              </h3>
              <p className='text-lg font-light text-irmin_black'>
                {dict.auth.invite.subtitle}
              </p>
            </div>
            {error && <p className='mb-4 text-red-800'>{error}</p>}
            {success && <p className='mb-4 text-irmin_green'>{success}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAcceptInvite();
              }}
            >
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='company'
                >
                  {dict.auth.invite.company}*
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel='Insert your company namehere'
                  type='text'
                  id='company'
                  placeholder={dict.auth.invite.companyPlaceholder}
                  defaultValue={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='password'
                >
                  {dict.auth.invite.password} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel='Insert your password here'
                  type='password'
                  id='password'
                  placeholder={dict.auth.invite.passwordPlaceholder}
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='passwordConfirmation'
                >
                  {dict.auth.invite.confirmPassword} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel='Repeat your password here'
                  type='password'
                  id='passwordConfirmation'
                  placeholder={dict.auth.invite.confirmPasswordPlaceholder}
                  defaultValue={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
              <Button
                className='mb-6 w-full'
                variant='solid'
                size='md'
                disabled={loading}
                loading={loading}
                type='submit'
              >
                {dict.auth.invite.accept} *
              </Button>
            </form>
            <Button
              className='w-full'
              variant='outline'
              colorScheme='secondary'
              size='md'
              onClick={handleDeclineInvite}
              disabled={loading}
            >
              {dict.auth.invite.decline} *
            </Button>
          </div>
        </div>
        <div className='md:absolute md:right-0 md:top-0 md:h-full md:w-1/2 md:pl-4'>
          <div className='bg-irmin_black-50 flex h-full items-center justify-center px-8 py-14'>
            <div className='mx-auto text-center md:max-w-xl'>
              <span className='relative z-10 mb-4 inline-block rounded-full bg-irmin_green-100 px-2 py-px text-xs font-light uppercase leading-5 text-irmin_green-500 shadow-sm'>
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
                <h3 className='relative text-2xl font-light leading-tight text-irmin_black md:text-3xl'>
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
                <h4 className='mb-2 text-lg font-semibold text-irmin_black'>
                  John Doe
                </h4>
                <span className='mb-8 block text-lg text-irmin_black'>
                  CEO &amp; Founder at Acme Inc.
                </span>
                <div className='flex items-center justify-center'>
                  <span className='mr-3 h-3 w-3 rounded-full bg-irmin_black-100' />
                  <span className='mr-3 h-3 w-3 rounded-full bg-irmin_green-500' />
                  <span className='h-3 w-3 rounded-full bg-irmin_black-100' />
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
