'use client';

import {
  Controller,
  DefaultValues,
  FieldValues,
  Path,
  useForm,
} from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

/**
 * The configuration for a field in the form
 *
 * @typeParam name - The name of the field
 * @typeParam label - The label for the field
 * @typeParam type - The type of the field
 * @typeParam placeholder - The placeholder for the field
 * @typeParam options - The options for the field if it's a select field
 * @typeParam rules - The validation rules for the field
 */
export interface FieldConfig<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: any;
}

interface SettingsFormProps<T extends FieldValues> {
  initialValues: DefaultValues<T>;
  onSubmit: (data: T) => void;
  fieldConfiguration: FieldConfig<T>[];
  deleteItem?: () => void;
  itemName?: string;
  dangerZoneMessage?: string;
  submitButtonLabel: string;
  deleteButtonLabel?: string;
  additionalDangerContent?: React.ReactNode;
}

/**
 * Universal settings form component for editing settings of workflows, repositories, and connections
 */
export default function SettingsForm<T extends FieldValues>({
  initialValues,
  onSubmit,
  fieldConfiguration,
  deleteItem,
  itemName = 'Item',
  dangerZoneMessage = 'This action cannot be undone. Deleting this item will remove it permanently.',
  submitButtonLabel,
  deleteButtonLabel,
  additionalDangerContent,
}: SettingsFormProps<T>) {
  const { dict } = useLocale();
  const {
    control,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<T>({
    defaultValues: initialValues,
  });

  return (
    <div className='container relative mx-auto my-8 max-w-6xl'>
      <div className='w-full max-w-4xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
        <div className='my-8 px-4'>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='flex flex-col gap-4'
          >
            {fieldConfiguration.map((field, idx) => (
              <div
                key={`field-${idx}-${field.name}`}
                className='flex flex-col gap-2'
              >
                <Label>{field.label}</Label>
                <Controller
                  name={field.name}
                  control={control}
                  rules={field.rules}
                  render={({ field: formField }) => (
                    <>
                      {field.type === 'text' || field.type === 'textarea' ? (
                        <Input
                          required={!!field.rules?.required}
                          type='text'
                          placeholder={field.placeholder}
                          {...formField}
                          longtext={
                            field.type === 'textarea' ? { rows: 3 } : undefined
                          }
                        />
                      ) : field.type === 'select' && field.options ? (
                        <ReactSelect
                          value={field.options.find(
                            (option) => option.value === formField.value
                          )}
                          onChange={(newValue) =>
                            formField.onChange(newValue?.value)
                          }
                          options={field.options}
                          getOptionLabel={(option) => option.label}
                          className='react-select-container'
                          classNamePrefix='react-select'
                        />
                      ) : null}
                      {errors[field.name] && (
                        <p className='mt-1 text-xs text-red-600'>
                          {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (errors[field.name] as any)?.message
                          }
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
            ))}
            <Button
              className='h-11 w-full'
              type='submit'
              size='sm'
              variant='default'
              disabled={!isDirty}
            >
              {submitButtonLabel}
            </Button>
          </form>
          {deleteItem && (
            <div className='mt-8'>
              <p className='text-sm font-normal capitalize text-destructive md:text-xl'>
                {dict.misc.dangerZone}
              </p>
              <p className='mt-2 max-w-sm text-xs md:text-sm'>
                {dangerZoneMessage}
              </p>
              <div className='flex gap-2'>
                <Button
                  className='mt-4'
                  size='sm'
                  variant='secondary'
                  onClick={deleteItem}
                >
                  {deleteButtonLabel ?? `Delete ${itemName}`}
                </Button>
                {additionalDangerContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
