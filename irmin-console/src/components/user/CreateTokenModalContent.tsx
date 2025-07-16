'use client';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  validFor: number;
  name: string;
}

/**
 * Content for the system API token creation form modal.
 *
 * @param props - The component props.
 * @param props.onCreate - The function to call to submit the form.
 * @param props.onClose - The function to call to close the modal.
 */
const CreateTokenModalContent = ({
  onCreate,
  onClose,
}: {
  onCreate: (_validFor: number, _name: string) => Promise<void>;
  onClose: () => void;
}) => {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      validFor: 3600, // 1 hour
      name: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    await onCreate(data.validFor, data.name);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-8'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.tokens.validFor}</Label>
        <Controller
          name='validFor'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} />
              {errors.validFor && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.validFor.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.common.description}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} />
              {errors.name && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.name.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <Button variant='default' size='sm' className='w-full' type='submit'>
        {dict.tokens.createAPIToken}
      </Button>
      <Button
        variant={'ghost'}
        size={'sm'}
        className='w-full'
        onClick={onClose}
      >
        {dict.common.cancel}
      </Button>
    </form>
  );
};

export default CreateTokenModalContent;
