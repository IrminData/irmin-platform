'use client';

import type {
  DefaultValues,
  FieldValues,
  Path,
  RegisterOptions,
} from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
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

/**
 * The configuration for a field in the form
 */
export interface FieldConfig<T extends FieldValues> {
  /** The name of the field */
  name: Path<T>;
  /** The label for the field */
  label: string;
  /** The type of the field */
  type: 'select' | 'text' | 'textarea';
  /** The placeholder for the field */
  placeholder?: string;
  /** The options for the field if it's a select field */
  options?: { value: string; label: string }[];
  /** The validation rules for the field */
  rules?: RegisterOptions<T, Path<T>>;
}

interface SettingsFormProps<T extends FieldValues> {
  /** The initial values for the form */
  initialValues: DefaultValues<T>;
  /** The function to call when the form is submitted */
  onSubmit: (_data: T) => void;
  /** Whether the form is submitting */
  submitting?: boolean;
  /** The configuration for each field in the form */
  fieldConfiguration: FieldConfig<T>[];
  /** The function to call when the delete button is clicked */
  deleteItem?: () => void;
  /** Whether the delete item is loading */
  deleteItemLoading?: boolean;
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
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether the delete button is disabled */
  deleteButtonDisabled?: boolean;
  /** Additional content to display in the form on the right side */
  additionalContentRight?: React.ReactNode;
}

/**
 * Universal settings form component for editing settings of workflows, repositories, and connections
 */
export default function SettingsForm<T extends FieldValues>({
  initialValues,
  onSubmit,
  submitting,
  fieldConfiguration,
  deleteItem,
  deleteItemLoading,
  itemName = 'Item',
  dangerZoneMessage = 'This action cannot be undone. Deleting this item will remove it permanently.',
  submitButtonLabel,
  deleteButtonLabel,
  additionalDangerContent,
  disabled,
  deleteButtonDisabled,
  additionalContentRight,
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
    <ContentWrapper wrapperClassName='py-8 flex flex-col md:flex-row gap-8 md:gap-12 px-4'>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-1 flex-col gap-4'
      >
        {fieldConfiguration.map((field) => (
          <div key={`field-${field.name}`} className='flex flex-col gap-2'>
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
                      disabled={submitting || disabled}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <Select
                      value={formField.value}
                      onValueChange={formField.onChange}
                      disabled={submitting || disabled}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder={field.placeholder}>
                          {
                            field.options.find(
                              (option) => option.value === formField.value
                            )?.label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {errors[field.name] && (
                    <p className='mt-1 text-xs text-destructive'>
                      {String(
                        (errors[field.name] as { message?: string } | undefined)
                          ?.message ?? ''
                      )}
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
          disabled={!isDirty || disabled}
          loading={submitting}
        >
          {submitButtonLabel}
        </Button>
      </form>
      {(additionalContentRight || deleteItem) && (
        <div className='flex flex-col gap-2'>
          {additionalContentRight}
          {deleteItem && (
            <div>
              <p
                className={`
                  text-sm font-normal text-destructive capitalize
                  md:text-xl
                `}
              >
                {dict.common.dangerZone}
              </p>
              <p
                className={`
                  mt-2 max-w-sm text-xs
                  md:text-sm
                `}
              >
                {dangerZoneMessage}
              </p>
              <div className='flex gap-2'>
                <Button
                  className='mt-4'
                  size='sm'
                  variant='secondary'
                  onClick={deleteItem}
                  loading={deleteItemLoading}
                  disabled={disabled || deleteButtonDisabled}
                >
                  {deleteButtonLabel ?? `Delete ${itemName}`}
                </Button>
                {additionalDangerContent}
              </div>
            </div>
          )}
        </div>
      )}
    </ContentWrapper>
  );
}
