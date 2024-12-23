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
import ContentWrapper from '@/components/ui/ContentWrapper';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

/**
 * The configuration for a field in the form
 */
export interface FieldConfig<T extends FieldValues> {
  /** The name of the field */
  name: Path<T>;
  /** The label for the field */
  label: string;
  /** The type of the field */
  type: 'text' | 'textarea' | 'select';
  /** The placeholder for the field */
  placeholder?: string;
  /** The options for the field if it's a select field */
  options?: { value: string; label: string }[];
  /** The validation rules for the field */
  rules?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any;
}

interface SettingsFormProps<T extends FieldValues> {
  /** The initial values for the form */
  initialValues: DefaultValues<T>;
  /** The function to call when the form is submitted */
  onSubmit: (data: T) => void;
  /** The configuration for each field in the form */
  fieldConfiguration: FieldConfig<T>[];
  /** The function to call when the delete button is clicked */
  deleteItem?: () => void;
  /** The name of the item being edited */
  itemName?: string;
  /** The message to display in the danger zone */
  dangerZoneMessage?: string;
  /** The label for the submit button */
  submitButtonLabel: string;
  /** The label for the delete button */
  deleteButtonLabel?: string;
  /** Additional content to display in the danger zone */
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
    <ContentWrapper wrapperClassName='py-8'>
      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
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
            {dict.common.dangerZone}
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
    </ContentWrapper>
  );
}
