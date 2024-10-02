'use client';

import React from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

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
            <p className='text-lg font-normal text-irmin_black dark:text-gray-200'>
              {dict.auth.signIn.subtitle}
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div className='mb-6'>
              <label className='mb-2 block font-normal text-irmin_black dark:text-gray-200'>
                {dict.auth.signIn.email}
              </label>
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
                    variant='solid'
                    colorScheme='black'
                    size='md'
                    required
                    className='w-full'
                    ariaLabel={dict.auth.signIn.email}
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
            <div className='mb-4'>
              <label className='mb-2 block font-normal text-irmin_black dark:text-gray-200'>
                {dict.auth.signIn.password}
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
                    required
                    className='w-full'
                    ariaLabel={dict.auth.signIn.password}
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
              <p className='mb-4 text-red-800'>{dict.misc.pleaseFixErrors}</p>
            ) : null}

            {/* Remember Me & Forgot Password */}
            <div className='mb-6 flex flex-wrap items-center justify-between'>
              <div className='w-full md:w-1/2'>
                <div className='flex items-center'>
                  <input
                    name='remember-me'
                    defaultChecked
                    type='checkbox'
                    className='h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500'
                  />
                  <label className='ms-2 text-sm font-normal text-irmin_black dark:text-gray-200'>
                    {dict.auth.signIn.rememberMe}
                  </label>
                </div>
              </div>
              <div className='mt-1 w-full md:w-auto'>
                <Button
                  variant='link'
                  href='/forgot-password'
                  size='sm'
                  colorScheme='gray'
                >
                  {dict.auth.signIn.forgotPassword}
                </Button>
              </div>
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
                size='md'
                colorScheme='secondary'
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
