'use client';

import React, { useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

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
 */
const AcceptInviteSection = () => {
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

  const { inviteService } = useMemo(() => new IrminCore(locale), [locale]);

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
        router.push('/portal/manage-workspaces');
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

  return (
    <WebsiteSectionWrapper id='accept-invite-section'>
      <div className='pt-16 md:py-32'>
        {!inviteId || inviteId === -1 ? (
          <div className='container mx-auto mb-16 max-w-7xl px-4 md:mb-0'>
            <div className='w-full md:pr-4'>
              <div className='mx-auto max-w-sm'>
                <div className='mb-6 text-center'>
                  <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                    {dict.auth.invite.invalid}
                  </h3>
                  <p className='text-lg font-normal text-irmin_black'>
                    {dict.auth.invite.invalidMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='container mx-auto mb-16 flex max-w-7xl flex-wrap px-4 md:mb-0'>
            <div className='w-full md:w-1/2 md:pl-4'>
              <div className='bg-irmin_black-50 flex h-full items-center justify-center px-8 py-14'>
                <div className='mx-auto text-center md:max-w-xl'>
                  <span className='relative z-10 mb-4 inline-block rounded-full bg-irmin_green-100 px-2 py-px text-xs font-normal uppercase leading-5 text-irmin_green-500 shadow-sm dark:shadow-gray-700'>
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
                    <h3 className='relative text-xl font-normal leading-tight text-irmin_black md:text-3xl'>
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
                      <span className='mr-3 h-3 w-3 rounded-full bg-irmin_light_green' />
                      <span className='mr-3 h-3 w-3 rounded-full bg-irmin_green' />
                      <span className='h-3 w-3 rounded-full bg-irmin_light_green' />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='w-full md:w-1/2 md:pr-4'>
              <div className='mb-6 text-center'>
                <h1 className='mb-2 font-display text-2xl font-bold md:text-3xl lg:text-5xl'>
                  {dict.auth.invite.title}
                </h1>
                <p className='text-lg font-normal text-irmin_black dark:text-gray-200'>
                  {dict.auth.invite.subtitle}
                </p>
              </div>
              <div className='mx-auto max-w-sm'>
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
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
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
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
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
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
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
                  <div className='mb-6 flex w-full items-center md:w-2/3'>
                    <input
                      name='accept-terms'
                      type='checkbox'
                      className='h-6 w-6 rounded border-gray-300 bg-gray-100'
                    />
                    <label className='ms-2 text-xs font-normal text-irmin_black dark:text-gray-200'>
                      {dict.auth.accept.accept}{' '}
                      <Link
                        className='dark:text-irmin_light text-irmin_blue-500 hover:text-irmin_blue-600 dark:hover:text-irmin_green'
                        href='/legal/terms-of-use'
                        target='_blank'
                      >
                        {dict.auth.accept.terms}
                      </Link>{' '}
                      {dict.auth.accept.and}{' '}
                      <Link
                        className='dark:text-irmin_light text-irmin_blue-500 hover:text-irmin_blue-600 dark:hover:text-irmin_green'
                        href='/legal/privacy-policy'
                        target='_blank'
                      >
                        {dict.auth.accept.privacy}
                      </Link>
                    </label>
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
                    {dict.auth.invite.accept}
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
                  {dict.auth.invite.decline}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WebsiteSectionWrapper>
  );
};

export default AcceptInviteSection;
