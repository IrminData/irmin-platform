'use client';

import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  queryName: string;
  queryDescription: string;
}

/**
 * Modal content to update an existing saved query.
 *
 * @param props - The props
 * @param props.currentName - The current name of the query
 * @param props.currentDescription - The current description of the query
 * @param props.updateQuery - Callback to update the query
 */
export default function UpdateQueryModal({
  currentName,
  currentDescription,
  updateQuery,
}: {
  currentName: string;
  currentDescription: string;
  updateQuery: (queryName: string, queryDescription: string) => Promise<void>;
}) {
  const { dict } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      queryName: currentName,
      queryDescription: currentDescription,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await updateQuery(data.queryName, data.queryDescription);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`transition-filter flex flex-col gap-4 pb-8 duration-200 ${
        isSubmitting ? 'pointer-events-none blur-xs' : ''
      }`}
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.common.name}</Label>
        <Controller
          name='queryName'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} disabled={isSubmitting} />
              {errors.queryName && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.queryName.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label>{dict.common.description}</Label>
        <Controller
          name='queryDescription'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                longtext={{
                  rows: 3,
                }}
                {...field}
                disabled={isSubmitting}
              />
              {errors.queryDescription && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.queryDescription.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={isSubmitting}
      >
        {isSubmitting ? dict.common.loading : dict.common.save}
      </Button>
    </form>
  );
}
