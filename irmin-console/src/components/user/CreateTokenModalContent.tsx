'use client';

import { useCallback, useState } from 'react';

import { format, isValid } from 'date-fns';
import { fi } from 'date-fns/locale/fi';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  validFor: number | undefined;
  name: string;
  durationType: string;
}

const DURATION_PRESETS = {
  oneHour: 3600,
  sixHours: 21600,
  oneDay: 86400,
  sevenDays: 604800,
  thirtyDays: 2592000,
  ninetyDays: 7776000,
  custom: 0,
} as const;

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
  const { dict, locale } = useLocale();
  const [showCustomInput, setShowCustomInput] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      validFor: DURATION_PRESETS.oneDay,
      name: '',
      durationType: 'oneDay',
    },
  });

  const validFor = useWatch({ control, name: 'validFor' });

  const calculateExpiryDate = useCallback(() => {
    if (!validFor || validFor <= 0) return null;
    const now = Date.now();
    const millisecondsToAdd = validFor * 1000;
    // Prevent overflow: check if the result would exceed safe integer range
    if (millisecondsToAdd > Number.MAX_SAFE_INTEGER - now) {
      return null;
    }
    const expiryDate = new Date(now + millisecondsToAdd);
    // Validate the date is actually valid (not Invalid Date)
    return isValid(expiryDate) ? expiryDate : null;
  }, [validFor]);

  const handleDurationTypeChange = (value: string) => {
    setValue('durationType', value);
    if (value === 'custom') {
      setShowCustomInput(true);
      setValue('validFor', undefined);
    } else {
      setShowCustomInput(false);
      setValue(
        'validFor',
        DURATION_PRESETS[value as keyof typeof DURATION_PRESETS]
      );
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (
      data.validFor === undefined ||
      isNaN(data.validFor) ||
      !Number.isFinite(data.validFor) ||
      data.validFor <= 0
    ) {
      return;
    }
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
          name='durationType'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                handleDurationTypeChange(value);
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='oneHour'>
                  {dict.tokens.durations.oneHour}
                </SelectItem>
                <SelectItem value='sixHours'>
                  {dict.tokens.durations.sixHours}
                </SelectItem>
                <SelectItem value='oneDay'>
                  {dict.tokens.durations.oneDay}
                </SelectItem>
                <SelectItem value='sevenDays'>
                  {dict.tokens.durations.sevenDays}
                </SelectItem>
                <SelectItem value='thirtyDays'>
                  {dict.tokens.durations.thirtyDays}
                </SelectItem>
                <SelectItem value='ninetyDays'>
                  {dict.tokens.durations.ninetyDays}
                </SelectItem>
                <SelectItem value='custom'>
                  {dict.tokens.durations.custom}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {showCustomInput && (
          <Controller
            name='validFor'
            control={control}
            rules={{
              required: dict.common.fieldRequired,
              min: {
                value: 1,
                message: dict.tokens.valueMustBePositive,
              },
              validate: (value) => {
                if (value === undefined) {
                  return dict.common.fieldRequired;
                }
                if (isNaN(value) || !Number.isFinite(value)) {
                  return dict.tokens.valueMustBeValidNumber;
                }
                // Prevent overflow: check if value * 1000 would exceed safe integer range
                const maxSafeSeconds = Math.floor(
                  (Number.MAX_SAFE_INTEGER - Date.now()) / 1000
                );
                if (value > maxSafeSeconds) {
                  return dict.tokens.valueTooLarge;
                }
                return true;
              },
            }}
            render={({ field }) => (
              <>
                <Input
                  {...field}
                  type='number'
                  min={1}
                  placeholder='Enter seconds'
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed) && Number.isFinite(parsed)) {
                      field.onChange(parsed);
                    }
                  }}
                />
                {errors.validFor && (
                  <p className='mt-1 text-xs text-red-600'>
                    {errors.validFor.message}
                  </p>
                )}
              </>
            )}
          />
        )}
        {(() => {
          const expiryDate = calculateExpiryDate();
          if (!expiryDate || !isValid(expiryDate)) {
            return null;
          }
          let formattedDate: string;
          try {
            formattedDate = format(expiryDate, 'PPpp', {
              locale: locale === 'fi' ? fi : undefined,
            });
          } catch {
            return null;
          }
          return (
            <p className='text-xs text-muted-foreground'>
              {dict.tokens.expiresOn}: {formattedDate}
            </p>
          );
        })()}
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
