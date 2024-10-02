'use client';

import {
  Controller,
  DefaultValues,
  FieldValues,
  Path,
  useForm,
} from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

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
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='my-8 px-4'>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='flex flex-col gap-4'
          >
            {fieldConfiguration.map((field) => (
              <div key={field.name}>
                <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                  {field.label}
                </label>
                <Controller
                  name={field.name}
                  control={control}
                  rules={field.rules}
                  render={({ field: formField }) => (
                    <>
                      {field.type === 'text' || field.type === 'textarea' ? (
                        <Input
                          size='sm'
                          variant='outline'
                          colorScheme='gray'
                          required={!!field.rules?.required}
                          className={
                            field.type === 'textarea' ? 'w-full' : 'h-11 w-full'
                          }
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
              colorScheme='primary'
              variant='solid'
              disabled={!isDirty}
            >
              {submitButtonLabel}
            </Button>
          </form>
          {deleteItem && (
            <div className='mt-8'>
              <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
                {dict.misc.dangerZone}
              </p>
              <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
                {dangerZoneMessage}
              </p>
              <Button
                className='mt-4 dark:bg-gray-800 dark:text-white'
                size='sm'
                colorScheme='secondary'
                variant='outline'
                onClick={deleteItem}
              >
                {deleteButtonLabel ?? `Delete ${itemName}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
