'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

// Define the form values type for react-hook-form
interface GeneralSettingsFormValues {
  name: string;
  email: string;
  company: string;
}

/**
 * General profile settings tab content using react-hook-form
 */
const GeneralSettings: React.FC = () => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { isLoading, profile, updateProfile } = useIAM();
  const [processing, setProcessing] = useState(false);

  const loading = isLoading || processing || !profile;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GeneralSettingsFormValues>({
    defaultValues: {
      name: '',
      email: '',
      company: '',
    },
  });

  // Sync profile data with form values
  useEffect(() => {
    if (profile) {
      setValue('name', profile.name);
      setValue('email', profile.email);
      setValue('company', profile.company ?? '');
    }
  }, [profile, setValue]);

  // Handle form submission and update profile
  const onSubmit = useCallback(
    async (data: GeneralSettingsFormValues) => {
      setProcessing(true);
      await updateProfile(data.name, data.company, data.email);
      irminAlert('success', dict.profile.profileUpdatedSuccessfully);
      setProcessing(false);
    },
    [updateProfile, irminAlert, dict]
  );

  return (
    <div className='my-8 px-4'>
      <div className='mb-4 mt-4 flex w-full flex-wrap items-center justify-between gap-2'>
        <h2 className='text-base lg:text-xl'>{dict.profile.generalSettings}</h2>
        <div className='max-w-40'>
          <LanguageSwitcher />
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='pb-8 text-sm md:text-base'
      >
        {/* Name Field */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.name}</Label>
          <Controller
            name='name'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <Input type='text' disabled={loading} {...field} />
            )}
          />
          {errors.name && (
            <p className='mt-1 text-xs text-red-600'>{errors.name.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.email}</Label>
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
              <Input type='email' disabled={loading} {...field} />
            )}
          />
          {errors.email && (
            <p className='mt-1 text-xs text-red-600'>{errors.email.message}</p>
          )}
        </div>

        {/* Company Field */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.company}</Label>
          <Controller
            name='company'
            control={control}
            render={({ field }) => (
              <Input type='text' disabled={loading} {...field} />
            )}
          />
        </div>

        {/* Save Changes Button */}
        <Button
          className='mt-4 w-full'
          type='submit'
          size='lg'
          disabled={loading}
          loading={loading}
        >
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};

export default GeneralSettings;
