'use client';

import React, { useCallback } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

// Define the form values type for react-hook-form
interface SignUpFormValues {
  name: string;
  company: string;
  email: string;
  emailConfirmation: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * Sign Up UI component
 */
const SignUpSection = () => {
  const { dict } = useLocale();
  const { register } = useIAM();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    defaultValues: {
      name: '',
      company: '',
      email: '',
      emailConfirmation: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  // Watch for email and password fields to validate confirmation fields
  const emailValue = watch('email');
  const passwordValue = watch('password');

  // Handle form submission and register the user
  const onSubmit = useCallback(
    async (data: SignUpFormValues) => {
      const {
        name,
        company,
        email,
        emailConfirmation,
        password,
        passwordConfirmation,
      } = data;

      // Make sure terms are accepted
      const acceptTerms = (
        document.querySelector('input[name="accept-terms"]') as HTMLInputElement
      ).checked;
      if (!acceptTerms) {
        return Promise.reject(new Error(dict.auth.accept.error));
      }

      // Register the user
      await register(
        name,
        company,
        email,
        emailConfirmation,
        password,
        passwordConfirmation,
        () => console.log('User registered successfully'),
        (error) => console.error('Registration failed:', error)
      );
    },
    [register, dict]
  );

  return (
    <WebsiteSectionWrapper id='sign-up-section'>
      <div className='container mx-auto mb-16 flex max-w-7xl flex-wrap px-4 py-16 md:mb-0 md:py-28'>
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
          <div className='mx-auto max-w-sm'>
            <div className='mb-6 text-center'>
              <h1 className='mb-2 font-display text-2xl font-bold md:text-3xl lg:text-5xl'>
                {dict.auth.signUp.title}
              </h1>
              <p className='text-lg font-normal text-foreground dark:text-gray-200'>
                {dict.auth.signUp.subtitle}
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Name Field */}
              <div className='mb-4 flex flex-col gap-2'>
                <Label>{dict.auth.signUp.name} *</Label>
                <Controller
                  name='name'
                  control={control}
                  rules={{ required: dict.misc.fieldRequired }}
                  render={({ field }) => (
                    <Input
                      aria-label={dict.auth.signUp.name}
                      type='text'
                      placeholder={dict.auth.signUp.namePlaceholder}
                      {...field}
                    />
                  )}
                />
                {errors.name && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Company Field */}
              <div className='mb-4 flex flex-col gap-2'>
                <Label>{dict.auth.signUp.company} *</Label>
                <Controller
                  name='company'
                  control={control}
                  rules={{ required: dict.misc.fieldRequired }}
                  render={({ field }) => (
                    <Input
                      aria-label={dict.auth.signUp.company}
                      type='text'
                      placeholder={dict.auth.signUp.companyPlaceholder}
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

              {/* Email Field */}
              <div className='mb-4 flex flex-col gap-2'>
                <Label>{dict.auth.signUp.email} *</Label>
                <Controller
                  name='email'
                  control={control}
                  rules={{
                    required: dict.misc.fieldRequired,
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: dict.profile.invalidEmail,
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      aria-label={dict.auth.signUp.email}
                      type='email'
                      placeholder={dict.auth.signUp.emailPlaceholder}
                      {...field}
                    />
                  )}
                />
                {errors.email && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Email Confirmation Field */}
              <div className='mb-4 flex flex-col gap-2'>
                <Label>{dict.auth.signUp.confirmEmail} *</Label>
                <Controller
                  name='emailConfirmation'
                  control={control}
                  rules={{
                    required: dict.misc.fieldRequired,
                    validate: (value) =>
                      value === emailValue || dict.profile.invalidEmail,
                  }}
                  render={({ field }) => (
                    <Input
                      aria-label={dict.auth.signUp.confirmEmail}
                      type='email'
                      placeholder={dict.auth.signUp.emailPlaceholder}
                      {...field}
                    />
                  )}
                />
                {errors.emailConfirmation && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.emailConfirmation.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className='mb-4 flex flex-col gap-2'>
                <Label>{dict.auth.signUp.password} *</Label>
                <Controller
                  name='password'
                  control={control}
                  rules={{
                    required: dict.misc.fieldRequired,
                    minLength: {
                      value: 8,
                      message: dict.misc.fieldInvalid,
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      aria-label={dict.auth.signUp.password}
                      type='password'
                      placeholder={dict.auth.signUp.passwordPlaceholder}
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
                <Label>{dict.auth.signUp.confirmPassword} *</Label>
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
                      aria-label={dict.auth.signUp.confirmPassword}
                      type='password'
                      placeholder={dict.auth.signUp.passwordPlaceholder}
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
                {dict.auth.signUp.signUp}
              </Button>

              {/* Already have an account? */}
              <div className='flex w-full items-center justify-center'>
                <span className='text-sm font-normal'>
                  {dict.auth.signUp.alreadyHaveAccount}{' '}
                </span>
                <Button
                  variant='link'
                  href='/sign-in'
                  className='my-0 py-0 dark:text-irmin_green'
                >
                  {dict.auth.signUp.signIn}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
};

export default SignUpSection;
