'use client';

import React, { useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';
import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useLocale } from '@/context/LocaleContext';

// Define form values type for react-hook-form
interface AcceptInviteFormValues {
  company: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * User invite UI component using react-hook-form
 */
const AcceptInviteSection = () => {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get('invite') ?? '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { inviteService } = useMemo(() => new IrminCore(locale), [locale]);

  // Initialize react-hook-form
  const {
    watch,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({
    defaultValues: {
      company: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const passwordValue = watch('password');

  // Handle invite acceptance
  const handleAcceptInvite = async (data: AcceptInviteFormValues) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await inviteService.acceptInvite(
        inviteId,
        data.company,
        data.password,
        data.passwordConfirmation
      );
      if (response.metadata?.message) {
        setSuccess(response.metadata.message);
        // Redirect to console on success
        router.push('/console/manage-workspaces');
      } else {
        throw new Error(response.message || 'Accepting invite failed');
      }
    } catch (error) {
      setError((error as Error)?.message ?? 'Accepting invite failed');
    }
  };

  // Handle invite decline
  const handleDeclineInvite = async () => {
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
    }
  };

  return (
    <WebsiteSectionWrapper id='accept-invite-section'>
      <div className='pt-16 md:py-32'>
        {!inviteId ? (
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
                {/* Form Submission */}
                <form onSubmit={handleSubmit(handleAcceptInvite)}>
                  {/* Company Field */}
                  <div className='mb-6'>
                    <label
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
                      htmlFor='company'
                    >
                      {dict.auth.invite.company}*
                    </label>
                    <Controller
                      name='company'
                      control={control}
                      rules={{ required: dict.misc.fieldRequired }}
                      render={({ field }) => (
                        <Input
                          variant='solid'
                          colorScheme='black'
                          size='md'
                          className='w-full'
                          ariaLabel='Insert your company name here'
                          placeholder={dict.auth.invite.companyPlaceholder}
                          {...field}
                        />
                      )}
                    />
                    {errors.company && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.company.message}
                      </p>
                    )}
                  </div>
                  {/* Password Field */}
                  <div className='mb-4'>
                    <label
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
                      htmlFor='password'
                    >
                      {dict.auth.invite.password} *
                    </label>
                    <Controller
                      name='password'
                      control={control}
                      rules={{ required: dict.misc.fieldRequired }}
                      render={({ field }) => (
                        <Input
                          variant='solid'
                          colorScheme='black'
                          size='md'
                          className='w-full'
                          ariaLabel='Insert your password here'
                          type='password'
                          placeholder={dict.auth.invite.passwordPlaceholder}
                          {...field}
                        />
                      )}
                    />
                    {errors.password && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                  {/* Password Confirmation Field */}
                  <div className='mb-4'>
                    <label
                      className='mb-2 block font-normal text-irmin_black dark:text-gray-200'
                      htmlFor='passwordConfirmation'
                    >
                      {dict.auth.invite.confirmPassword} *
                    </label>
                    <Controller
                      name='passwordConfirmation'
                      control={control}
                      rules={{
                        required: dict.misc.fieldRequired,
                        validate: (value) =>
                          value === passwordValue ||
                          dict.profile.passwordsDoNotMatch,
                      }}
                      render={({ field }) => (
                        <Input
                          variant='solid'
                          colorScheme='black'
                          size='md'
                          className='w-full'
                          ariaLabel='Repeat your password here'
                          type='password'
                          placeholder={
                            dict.auth.invite.confirmPasswordPlaceholder
                          }
                          {...field}
                        />
                      )}
                    />
                    {errors.passwordConfirmation && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.passwordConfirmation.message}
                      </p>
                    )}
                  </div>
                  {/* Terms & Conditions */}
                  <div className='mb-6 flex w-full items-center md:w-2/3'>
                    <input
                      name='accept-terms'
                      type='checkbox'
                      className='h-6 w-6 rounded border-gray-300 bg-gray-100'
                    />
                    <label className='ms-2 text-xs font-normal text-irmin_black dark:text-gray-200'>
                      {dict.auth.accept.accept}{' '}
                      <Link
                        className='text-irmin_blue-500 hover:text-irmin_blue-600 dark:text-irmin_light_green dark:hover:text-irmin_green'
                        href='/legal/terms-of-use'
                        target='_blank'
                      >
                        {dict.auth.accept.terms}
                      </Link>{' '}
                      {dict.auth.accept.and}{' '}
                      <Link
                        className='text-irmin_blue-500 hover:text-irmin_blue-600 dark:text-irmin_light_green dark:hover:text-irmin_green'
                        href='/legal/privacy-policy'
                        target='_blank'
                      >
                        {dict.auth.accept.privacy}
                      </Link>
                    </label>
                  </div>
                  {/* Submit Button */}
                  <Button
                    className='mb-6 w-full'
                    variant='gradient'
                    colorScheme='primary'
                    size='md'
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    type='submit'
                  >
                    {dict.auth.invite.accept}
                  </Button>
                </form>
                {/* Decline Button */}
                <Button
                  className='w-full'
                  variant='outline'
                  colorScheme='secondary'
                  size='md'
                  onClick={handleDeclineInvite}
                  disabled={isSubmitting}
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
