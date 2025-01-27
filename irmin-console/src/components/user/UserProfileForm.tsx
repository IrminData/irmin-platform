'use client';

import { useCallback, useEffect, useState } from 'react';

import { SubmitHandler, useForm } from 'react-hook-form';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

type ProfileFormInputs = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  profile_picture: FileList | null;
};

/**
 * Form component to edit user profile
 */
export default function UserProfileForm() {
  const { profile, updateProfile } = useIAM();
  const { dict } = useLocale();

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    profile?.profile_picture || null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ProfileFormInputs>({
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      company: profile?.company || '',
      profile_picture: null,
    },
  });

  const onSubmit: SubmitHandler<ProfileFormInputs> = useCallback(
    async (data) => {
      await updateProfile(
        data.first_name,
        data.last_name,
        data.email,
        data.phone,
        data.company,
        data.profile_picture ?? undefined
      );
    },
    [updateProfile]
  );

  const watchProfilePicture = watch('profile_picture');

  useEffect(() => {
    if (watchProfilePicture && watchProfilePicture.length > 0) {
      const file = watchProfilePicture[0];
      if (file) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  }, [watchProfilePicture]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div className='mb-4 flex justify-center'>
        <Avatar className='h-24 w-24'>
          <AvatarImage
            src={previewUrl || profile?.profile_picture || undefined}
            alt='Profile picture'
          />
          <AvatarFallback>
            {profile?.first_name?.[0]}
            {profile?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='profile_picture' className='text-sm'>
          {dict.users.changeProfilePicture}
        </Label>
        <Input
          id='profile_picture'
          type='file'
          accept='image/*'
          {...register('profile_picture')}
          className='file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold'
        />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='first_name' className='text-sm'>
            {dict.users.firstName}
          </Label>
          <Input
            id='first_name'
            {...register('first_name', {
              required: dict.common.fieldRequired,
            })}
            className='w-full'
          />
          {errors.first_name && (
            <p className='text-sm text-red-500'>{errors.first_name.message}</p>
          )}
        </div>
        <div className='space-y-2'>
          <Label htmlFor='last_name' className='text-sm'>
            {dict.users.lastName}
          </Label>
          <Input
            id='last_name'
            {...register('last_name', {
              required: dict.common.fieldRequired,
            })}
            className='w-full'
          />
          {errors.last_name && (
            <p className='text-sm text-red-500'>{errors.last_name.message}</p>
          )}
        </div>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='email' className='text-sm'>
          {dict.users.email}
        </Label>
        <Input
          id='email'
          type='email'
          {...register('email', {
            required: dict.common.fieldRequired,
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: dict.common.fieldInvalid,
            },
          })}
          className='w-full'
        />
        {errors.email && (
          <p className='text-sm text-red-500'>{errors.email.message}</p>
        )}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='phone' className='text-sm'>
          {dict.users.phone}
        </Label>
        <Input
          id='phone'
          type='tel'
          {...register('phone')}
          className='w-full'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='company' className='text-sm'>
          {dict.users.company}
        </Label>
        <Input id='company' {...register('company')} className='w-full' />
      </div>
      <Button
        type='submit'
        disabled={isSubmitting}
        className='w-full'
        size={'sm'}
        variant={'accent'}
      >
        {dict.users.updateProfile}
      </Button>
    </form>
  );
}
