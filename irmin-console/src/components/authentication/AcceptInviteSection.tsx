'use client';

import React, { useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';
import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
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
      const res = await inviteService.acceptInvite(
        inviteId,
        data.company,
        data.password,
        data.passwordConfirmation
      );
      setSuccess(res.message ?? 'Invite accepted');
      // Redirect to console on success
      router.push('/console/manage-workspaces');
    } catch (error) {
      setError((error as Error)?.message ?? 'Accepting invite failed');
    }
  };

  // Handle invite decline
  const handleDeclineInvite = async () => {
    setError(null);
    setSuccess(null);

    try {
      const res = await inviteService.declineInvite(inviteId);
      setSuccess(res.message ?? 'Invite declined');
      // Redirect to homepage or another page on successful decline
      router.push('/');
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
                  <p className='text-lg font-normal text-foreground'>
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
                    <h3 className='relative text-xl font-normal leading-tight text-foreground md:text-3xl'>
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
                    <h4 className='mb-2 text-lg font-semibold text-foreground'>
                      John Doe
                    </h4>
                    <span className='mb-8 block text-lg text-foreground'>
                      CEO &amp; Founder at Acme Inc.
                    </span>
                    <div className='flex items-center justify-center'>
                      <span className='bg-irmin_light_green mr-3 h-3 w-3 rounded-full' />
                      <span className='mr-3 h-3 w-3 rounded-full bg-irmin_green' />
                      <span className='bg-irmin_light_green h-3 w-3 rounded-full' />
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
                <p className='text-lg font-normal text-foreground dark:text-gray-200'>
                  {dict.auth.invite.subtitle}
                </p>
              </div>
              <div className='mx-auto max-w-sm'>
                {error && <p className='mb-4 text-destructive'>{error}</p>}
                {success && <p className='mb-4 text-irmin_green'>{success}</p>}
                {/* Form Submission */}
                <form onSubmit={handleSubmit(handleAcceptInvite)}>
                  {/* Company Field */}
                  <div className='mb-4 flex flex-col gap-2'>
                    <Label>{dict.auth.invite.company} *</Label>
                    <Controller
                      name='company'
                      control={control}
                      rules={{ required: dict.misc.fieldRequired }}
                      render={({ field }) => (
                        <Input
                          aria-label='Insert your company name here'
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
                  <div className='mb-4 flex flex-col gap-2'>
                    <Label>{dict.auth.invite.password} *</Label>
                    <Controller
                      name='password'
                      control={control}
                      rules={{ required: dict.misc.fieldRequired }}
                      render={({ field }) => (
                        <Input
                          aria-label='Insert your password here'
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
                  <div className='mb-4 flex flex-col gap-2'>
                    <Label>{dict.auth.invite.confirmPassword} *</Label>
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
                          aria-label='Repeat your password here'
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
                    <Checkbox id='accept-terms' name='accept-terms' />
                    <Label htmlFor='accept-terms'>
                      {dict.auth.accept.accept}{' '}
                      <Link
                        className='dark:text-irmin_light_green text-irmin_blue-500 hover:text-irmin_blue-600 dark:hover:text-irmin_green'
                        href='/legal/terms-of-use'
                        target='_blank'
                      >
                        {dict.auth.accept.terms}
                      </Link>{' '}
                      {dict.auth.accept.and}{' '}
                      <Link
                        className='dark:text-irmin_light_green text-irmin_blue-500 hover:text-irmin_blue-600 dark:hover:text-irmin_green'
                        href='/legal/privacy-policy'
                        target='_blank'
                      >
                        {dict.auth.accept.privacy}
                      </Link>
                    </Label>
                  </div>
                  {/* Submit Button */}
                  <Button
                    className='mb-6 w-full'
                    variant='gradient'
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
