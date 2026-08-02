'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  customRef: string;
}

/**
 * Modal content to enter a custom ref (tag name or commit hash).
 *
 * @param props - The props
 * @param props.onSubmit - Callback when the form is submitted with valid custom ref
 * @param props.onCancel - Callback when the user cancels
 */
export default function CustomRefModalContent({
  onSubmit,
  onCancel,
}: {
  onSubmit: (customRef: string) => void;
  onCancel: () => void;
}) {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      customRef: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleFormSubmit = useCallback(
    async (data: FormValues) => {
      setLoading(true);
      try {
        onSubmit(data.customRef.trim());
      } catch (error) {
        console.error('Failed to submit custom ref', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [onSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className='flex flex-col gap-4 pb-8'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.compare.enterCustomRef}</Label>
        <Controller
          name='customRef'
          control={control}
          rules={{
            required: dict.common.fieldRequired,
            validate: (value) => {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                return dict.common.fieldRequired;
              }
              return true;
            },
          }}
          render={({ field }) => (
            <>
              <Input
                {...field}
                disabled={loading}
                placeholder={dict.repository.compare.customRefPlaceholder}
              />
              {errors.customRef && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.customRef.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-row gap-2'>
        <Button
          variant='gray'
          className='w-full'
          type='button'
          onClick={onCancel}
          disabled={loading}
        >
          {dict.common.cancel}
        </Button>
        <Button
          variant='default'
          className='w-full'
          type='submit'
          loading={loading}
        >
          {dict.common.save}
        </Button>
      </div>
    </form>
  );
}
