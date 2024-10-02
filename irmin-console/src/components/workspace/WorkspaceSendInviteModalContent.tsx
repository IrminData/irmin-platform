'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { IrminRole, IrminRoleNames } from '@/types/core/IrminRole';

interface InviteFormValues {
  name: string;
  email: string;
  role: IrminRoleNames;
}

/**
 * Workspace send invite modal content
 *
 * @param props - Component props
 * @param props.onClose - Function to close the modal
 * @param props.irminRoles - List of available roles
 */
const WorkspaceSendInviteModalContent = ({
  irminRoles,
  onClose,
}: {
  irminRoles: IrminRole[];
  onClose: (open: boolean) => void;
}) => {
  const { dict } = useLocale();
  const {
    invites: { sendInvite },
  } = useWorkspace();
  const { irminAlert } = usePopup();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<InviteFormValues>({
    defaultValues: {
      name: '',
      email: '',
      role: irminRoles[0]?.name,
    },
  });

  const handleInvite = useCallback(
    async (data: InviteFormValues) => {
      try {
        // Clear any previous errors
        clearErrors();

        // Invite the user
        const res = await sendInvite(data.name, data.email, data.role);

        // Close the modal and inform that invite has been sent
        onClose(false);
        irminAlert(
          'success',
          res.metadata?.message ?? 'Invite sent successfully'
        );
      } catch (error) {
        console.error('Error inviting user:', error);
        setError('email', {
          message: (error as Error)?.message ?? 'Error inviting user',
        });
      }
    },
    [sendInvite, onClose, irminAlert, clearErrors, setError]
  );

  return (
    <form onSubmit={handleSubmit(handleInvite)} className='pb-4'>
      <div className='mb-4'>
        <label className='block text-gray-700'>
          {dict.usersPermissions.name}
        </label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <Input
              variant='solid'
              colorScheme='gray'
              className='mt-2 w-full'
              size='sm'
              type='text'
              placeholder='John Doe'
              {...field}
            />
          )}
        />
        {errors.name && (
          <p className='mt-1 text-red-800'>{errors.name.message}</p>
        )}
      </div>

      <div className='mb-4'>
        <label className='block text-gray-700'>
          {dict.usersPermissions.email}
        </label>
        <Controller
          name='email'
          control={control}
          rules={{
            required: dict.misc.fieldRequired,
            pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          }}
          render={({ field }) => (
            <Input
              variant='solid'
              colorScheme='gray'
              className='mt-2 w-full'
              size='sm'
              type='email'
              placeholder='johndoe@example.com'
              {...field}
            />
          )}
        />
        {errors.email && (
          <p className='mt-1 text-red-800'>{errors.email.message}</p>
        )}
      </div>

      <div className='mb-4'>
        <label className='block text-gray-700'>
          {dict.usersPermissions.role}
        </label>
        <div className='mt-2 w-full'>
          <Controller
            name='role'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <ReactSelect
                {...field}
                value={
                  field.value
                    ? {
                        value: field.value,
                        label: irminRoles.find((a) => a.name === field.value)
                          ?.label,
                      }
                    : {
                        value: irminRoles[0]?.name,
                        label: irminRoles[0]?.label,
                      }
                }
                onChange={(val) => field.onChange(val?.value)}
                options={irminRoles.map((role) => ({
                  value: role.name,
                  label: role.label,
                }))}
                isSearchable={false}
                isClearable={false}
                className='react-select-container'
                classNamePrefix='react-select'
              />
            )}
          />
        </div>
        {errors.role && (
          <p className='mt-1 text-red-800'>{errors.role.message}</p>
        )}
      </div>

      <div className='flex flex-row gap-2'>
        <Button
          size='sm'
          variant='link'
          colorScheme='primary'
          onClick={() => onClose(false)}
        >
          {dict.usersPermissions.cancel}
        </Button>
        <Button
          size='sm'
          className='ml-auto min-w-32'
          variant='solid'
          colorScheme='primary'
          type='submit'
        >
          {dict.usersPermissions.invite}
        </Button>
      </div>
    </form>
  );
};

export default WorkspaceSendInviteModalContent;
