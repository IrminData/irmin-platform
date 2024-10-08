'use client';

import React from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

// Define the form values type for react-hook-form
interface SignInFormValues {
  email: string;
  password: string;
}

/**
 * Sign in UI component
 */
const SignInSection = () => {
  const { dict } = useLocale();
  const { login } = useIAM();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: SignInFormValues) => {
    await login(
      data.email,
      data.password,
      () => {},
      () => {}
    );
  };

  return (
    <WebsiteSectionWrapper id='sign-in-section'>
      <div className='container mx-auto max-w-7xl px-4 py-16 md:py-28'>
        <div className='mx-auto max-w-sm'>
          <div className='mb-6 text-center'>
            <h1 className='mb-2 font-display text-2xl font-bold md:text-3xl lg:text-5xl'>
              {dict.auth.signIn.title}
            </h1>
            <p className='text-lg font-normal text-foreground dark:text-gray-200'>
              {dict.auth.signIn.subtitle}
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div className='mb-4 flex flex-col gap-2'>
              <Label>{dict.auth.signIn.email} *</Label>
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
                    aria-label={dict.auth.signIn.email}
                    type='email'
                    id='email'
                    placeholder={dict.auth.signIn.emailPlaceholder}
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

            {/* Password Field */}
            <div className='mb-4 flex flex-col gap-2'>
              <Label>{dict.auth.signIn.password} *</Label>
              <Controller
                name='password'
                control={control}
                rules={{ required: dict.misc.fieldRequired }}
                render={({ field }) => (
                  <Input
                    aria-label={dict.auth.signIn.password}
                    type='password'
                    placeholder={dict.auth.signIn.passwordPlaceholder}
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

            {/* Error Messages */}
            {errors.email || errors.password ? (
              <p className='mb-4 text-destructive'>
                {dict.misc.pleaseFixErrors}
              </p>
            ) : null}

            {/* Remember Me & Forgot Password */}
            <div className='mb-6 flex flex-wrap items-center justify-between'>
              <div className='w-full md:w-1/2'>
                <div className='flex items-center'>
                  <Checkbox
                    name='remember-me'
                    id='remember-me'
                    defaultChecked
                  />
                  <Label htmlFor='remember-me'>
                    {dict.auth.signIn.rememberMe}
                  </Label>
                </div>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Button variant='link' href='/forgot-password' size='sm'>
                  {dict.auth.signIn.forgotPassword}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className='mb-6 w-full'
              variant='gradient'
              disabled={isSubmitting}
              loading={isSubmitting}
              type='submit'
            >
              {dict.auth.signIn.signIn}
            </Button>

            {/* Sign Up Link */}
            <div className='flex w-full items-center justify-center'>
              <span className='text-sm font-normal'>
                {dict.auth.signIn.dontHaveAccount}{' '}
              </span>
              <Button
                variant='link'
                href='/sign-up'
                className='my-0 py-0 dark:text-irmin_green'
              >
                {dict.auth.signIn.signUp}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
};

export default SignInSection;
