'use client';

import React, { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Sign up UI component
 *
 * @remarks
 *
 * UI for the sign up form. It allows users to sign up to the application.
 * It uses the {@link useIAM} hook to interact with the user's identity and APIs
 */
const SignUpSection = () => {
  const { dict } = useLocale();
  const { register } = useIAM();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Make sure terms are accepted
    const acceptTerms = (
      document.querySelector('input[name="accept-terms"]') as HTMLInputElement
    ).checked;
    if (!acceptTerms) {
      setError(dict.auth.accept.error);
      setLoading(false);
      return;
    }
    // Register the user
    await register(
      name,
      company,
      email,
      emailConfirmation,
      password,
      passwordConfirmation,
      setSuccess,
      setError
    );
    setLoading(false);
  };

  return (
    <WebsiteSectionWrapper id='sign-up-section'>
      <div className='container mx-auto mb-16 flex max-w-7xl flex-wrap px-4 py-16 md:mb-0 md:py-28'>
        <div className='w-full md:w-1/2 md:pl-4'>
          <div className='bg-irmin_black-50 flex h-full items-center justify-center px-8 py-14'>
            <div className='mx-auto text-center md:max-w-xl'>
              <span className='relative z-10 mb-4 inline-block rounded-full bg-irmin_green-100 px-2 py-px text-xs font-light uppercase leading-5 text-irmin_green-500 shadow-sm dark:shadow-gray-800'>
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
                <h3 className='relative text-xl font-light leading-tight text-irmin_black md:text-3xl'>
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
          <div className='mx-auto max-w-sm'>
            <div className='mb-6 text-center'>
              <h3 className='mb-4 text-2xl font-bold md:text-3xl'>
                {dict.auth.signUp.title}
              </h3>
              <p className='text-lg font-light text-irmin_black'>
                {dict.auth.signUp.subtitle}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='name'
                >
                  {dict.auth.signUp.name} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.name}
                  type='text'
                  id='name'
                  placeholder={dict.auth.signUp.namePlaceholder}
                  defaultValue={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='company'
                >
                  {dict.auth.signUp.company} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.company}
                  type='text'
                  id='company'
                  placeholder={dict.auth.signUp.companyPlaceholder}
                  defaultValue={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='email'
                >
                  {dict.auth.signUp.email} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.email}
                  type='email'
                  id='email'
                  placeholder={dict.auth.signUp.emailPlaceholder}
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className='mb-6'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='emailConfirmation'
                >
                  {dict.auth.signUp.confirmEmail} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.confirmEmail}
                  type='email'
                  id='emailConfirmation'
                  placeholder={dict.auth.signUp.emailPlaceholder}
                  defaultValue={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='password'
                >
                  {dict.auth.signUp.password} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.password}
                  type='password'
                  id='password'
                  placeholder={dict.auth.signUp.passwordPlaceholder}
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className='mb-4'>
                <label
                  className='mb-2 block font-light text-irmin_black'
                  htmlFor='passwordConfirmation'
                >
                  {dict.auth.signUp.confirmPassword} *
                </label>
                <Input
                  variant='solid'
                  colorScheme='black'
                  size='md'
                  required
                  className='w-full'
                  ariaLabel={dict.auth.signUp.confirmPassword}
                  type='password'
                  id='passwordConfirmation'
                  placeholder={dict.auth.signUp.passwordPlaceholder}
                  defaultValue={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
              {error && <p className='mb-4 text-red-800'>{error}</p>}
              {success && <p className='mb-4 text-irmin_green'>{success}</p>}
              <div className='mb-6 flex w-full items-center md:w-2/3'>
                <input
                  name='accept-terms'
                  type='checkbox'
                  className='h-6 w-6 rounded border-gray-300 bg-gray-100'
                />
                <label className='ms-2 text-xs font-light text-irmin_black'>
                  {dict.auth.accept.accept}{' '}
                  <Link
                    className='text-irmin_blue-500 hover:text-irmin_blue-600'
                    href='/legal/terms-of-use'
                    target='_blank'
                  >
                    {dict.auth.accept.terms}
                  </Link>{' '}
                  {dict.auth.accept.and}{' '}
                  <Link
                    className='text-irmin_blue-500 hover:text-irmin_blue-600'
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
                {dict.auth.signUp.signUp}
              </Button>
              <div className='flex w-full items-center justify-center'>
                <span className='text-sm font-light'>
                  {dict.auth.signUp.alreadyHaveAccount}{' '}
                </span>
                <Button
                  variant='link'
                  href='/sign-in'
                  size='md'
                  colorScheme='secondary'
                  className='my-0 py-0'
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
