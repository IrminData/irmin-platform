'use client';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

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
      <h2 className='mb-4 text-lg lg:text-xl'>{dict.profile.changePassword}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className='text-sm md:text-base'>
        {/* Current Password */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.currentPassword}</Label>
          <Controller
            name='currentPassword'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => <Input type='password' {...field} />}
          />
          {errors.currentPassword && (
            <p className='text-xs text-red-600'>
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.newPassword}</Label>
          <Controller
            name='newPassword'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => <Input type='password' {...field} />}
          />
          {errors.newPassword && (
            <p className='text-xs text-red-600'>{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className='mb-4 flex flex-col gap-2'>
          <Label>{dict.profile.confirmNewPassword}</Label>
          <Controller
            name='confirmNewPassword'
            control={control}
            rules={{
              required: dict.misc.fieldRequired,
              validate: (value) =>
                value === newPasswordValue || dict.profile.passwordsDoNotMatch,
            }}
            render={({ field }) => <Input type='password' {...field} />}
          />
          {errors.confirmNewPassword && (
            <p className='text-xs text-red-600'>
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        {/* Save Changes Button */}
        <Button className='mt-4 w-full' type='submit' size='lg'>
          {dict.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;
