'use client';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { IrminRole, Role } from '@/types/core/IrminRole';

interface InviteFormValues {
  email: string;
  role: IrminRole;
}

/**
 * Workspace send invite modal content
 *
 * @param props - Component props
 * @param props.onClose - Function to close the modal
 * @param props.handleInvite - Function to send the invite
 * @param props.roles - List of available roles
 */
const WorkspaceSendInviteModalContent = ({
  roles,
  handleInvite,
  onClose,
}: {
  roles: Role[];
  handleInvite: (data: InviteFormValues) => void;
  onClose: (open: boolean) => void;
}) => {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    defaultValues: {
      email: '',
      role: roles[0]?.name,
    },
  });

  return (
    <>
      <form
        onSubmit={handleSubmit(handleInvite)}
        className='flex flex-col gap-4 pb-4'
      >
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.email}</Label>
          <Controller
            name='email'
            control={control}
            rules={{
              required: dict.common.fieldRequired,
              pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            }}
            render={({ field }) => (
              <Input
                className='mt-2'
                type='email'
                placeholder='john@example.com'
                {...field}
              />
            )}
          />
          {errors.email && (
            <p className='text-destructive mt-1'>{errors.email.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.role}</Label>
          <div className='mt-2 w-full'>
            <Controller
              name='role'
              control={control}
              rules={{ required: dict.common.fieldRequired }}
              render={({ field }) => (
                <ReactSelect
                  {...field}
                  value={
                    field.value
                      ? {
                          value: field.value,
                          label: roles.find((a) => a.name === field.value)
                            ?.label,
                        }
                      : {
                          value: roles[0]?.name,
                          label: roles[0]?.label,
                        }
                  }
                  onChange={(val) => field.onChange(val?.value)}
                  options={roles.map((role) => ({
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
            <p className='text-destructive mt-1'>{errors.role.message}</p>
          )}
        </div>
        <div className='flex flex-row gap-2'>
          <Button size='sm' variant='link' onClick={() => onClose(false)}>
            {dict.common.cancel}
          </Button>
          <Button
            size='sm'
            className='ml-auto min-w-32'
            variant='default'
            type='submit'
          >
            {dict.users.invite}
          </Button>
        </div>
      </form>
    </>
  );
};

export default WorkspaceSendInviteModalContent;
