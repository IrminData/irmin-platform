'use client';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

// Define the type for form values
interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Change password tab content using react-hook-form
 */
const ChangePassword = () => {
  const { dict } = useLocale();

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  // Watch the newPassword value to validate confirmNewPassword against it
  const newPasswordValue = watch('newPassword');

  // Handle form submission
  const onSubmit = (data: ChangePasswordFormValues) => {
    console.log('Change password data:', data);
    // TODO: Implement logic to change the user's password
  };

  return (
    <div className='my-8 px-4'>
      <h2 className='mb-8 font-display text-xl font-bold sm:text-2xl lg:text-3xl'>
        {dict.profile.changePassword}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className='text-sm md:text-base'>
        {/* Current Password */}
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.currentPassword}
          </label>
          <Controller
            name='currentPassword'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                type='password'
                className='mt-2 w-full'
                {...field}
              />
            )}
          />
          {errors.currentPassword && (
            <p className='mt-1 text-xs text-red-600'>
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.newPassword}
          </label>
          <Controller
            name='newPassword'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                type='password'
                className='mt-2 w-full'
                {...field}
              />
            )}
          />
          {errors.newPassword && (
            <p className='mt-1 text-xs text-red-600'>
              {errors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className='mb-4'>
          <label className='block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
            {dict.profile.confirmNewPassword}
          </label>
          <Controller
            name='confirmNewPassword'
            control={control}
            rules={{
              required: dict.misc.fieldRequired,
              validate: (value) =>
                value === newPasswordValue || dict.profile.passwordsDoNotMatch,
            }}
            render={({ field }) => (
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                type='password'
                className='mt-2 w-full'
                {...field}
              />
            )}
          />
          {errors.confirmNewPassword && (
            <p className='mt-1 text-xs text-red-600'>
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        {/* Save Changes Button */}
        <Button
          className='mt-4 w-full'
          type='submit'
          size='sm'
          colorScheme='light'
          variant='solid'
        >
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;
