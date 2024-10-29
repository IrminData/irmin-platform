'use client';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { IrminRole } from '@/types/core/IrminRole';

interface InviteFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
}

/**
 * Workspace send invite modal content
 *
 * @param props - Component props
 * @param props.onClose - Function to close the modal
 * @param props.handleInvite - Function to send the invite
 * @param props.irminRoles - List of available roles
 */
const WorkspaceSendInviteModalContent = ({
  irminRoles,
  handleInvite,
  onClose,
}: {
  irminRoles: IrminRole[];
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
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      role: irminRoles[0]?.name,
    },
  });

  return (
    <>
      <form
        onSubmit={handleSubmit(handleInvite)}
        className='flex flex-col gap-4 pb-4'
      >
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.firstName}</Label>
          <Controller
            name='firstName'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <Input
                className='mt-2'
                type='text'
                placeholder='John'
                {...field}
              />
            )}
          />
          {errors.firstName && (
            <p className='mt-1 text-destructive'>{errors.firstName.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.lastName}</Label>
          <Controller
            name='lastName'
            control={control}
            rules={{ required: dict.misc.fieldRequired }}
            render={({ field }) => (
              <Input
                className='mt-2'
                type='text'
                placeholder='Doe'
                {...field}
              />
            )}
          />
          {errors.lastName && (
            <p className='mt-1 text-destructive'>{errors.lastName.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.email}</Label>
          <Controller
            name='email'
            control={control}
            rules={{
              required: dict.misc.fieldRequired,
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
            <p className='mt-1 text-destructive'>{errors.email.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.phone}</Label>
          <Controller
            name='phone'
            control={control}
            rules={{
              required: dict.misc.fieldRequired,
            }}
            render={({ field }) => (
              <Input
                className='mt-2'
                type='tel'
                placeholder='+12014270935'
                {...field}
              />
            )}
          />
          {errors.phone && (
            <p className='mt-1 text-destructive'>{errors.phone.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.company}</Label>
          <Controller
            name='company'
            control={control}
            rules={{
              required: dict.misc.fieldRequired,
            }}
            render={({ field }) => (
              <Input
                className='mt-2'
                type='company'
                placeholder='Example Inc.'
                {...field}
              />
            )}
          />
          {errors.company && (
            <p className='mt-1 text-destructive'>{errors.company.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.users.role}</Label>
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
            <p className='mt-1 text-destructive'>{errors.role.message}</p>
          )}
        </div>
        <div className='flex flex-row gap-2'>
          <Button size='sm' variant='link' onClick={() => onClose(false)}>
            {dict.users.cancel}
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
