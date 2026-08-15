'use client';

import { useId } from 'react';

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

const toDomId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

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
  itemName,
  dangerZoneMessage,
  submitButtonLabel,
  deleteButtonLabel,
  additionalDangerContent,
  disabled,
  deleteButtonDisabled,
  additionalContentRight,
}: SettingsFormProps<T>) {
  const { dict } = useLocale();
  const resolvedItemName = itemName ?? dict.common.item;
  const resolvedDangerZoneMessage =
    dangerZoneMessage ?? dict.common.permanentDeleteDescription;
  const generatedFormId = useId();
  const formId = `settings-form-${toDomId(generatedFormId)}`;
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<T>({
    defaultValues: initialValues,
  });

  return (
    <ContentWrapper wrapperClassName='py-8 flex flex-col md:flex-row gap-8 md:gap-12 px-4'>
      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-1 flex-col gap-4'
      >
        {fieldConfiguration.map((field, index) => {
          const fieldId = `${formId}-${toDomId(field.name)}-${index}`;
          const errorId = `${fieldId}-error`;

          return (
            <div key={`field-${field.name}`} className='flex flex-col gap-2'>
              <Label htmlFor={fieldId}>{field.label}</Label>
              <Controller
                name={field.name}
                control={control}
                rules={field.rules}
                render={({ field: formField, fieldState }) => (
                  <>
                    {field.type === 'text' || field.type === 'textarea' ? (
                      <Input
                        {...formField}
                        id={fieldId}
                        required={!!field.rules?.required}
                        type='text'
                        placeholder={field.placeholder}
                        longtext={
                          field.type === 'textarea' ? { rows: 3 } : undefined
                        }
                        disabled={submitting || disabled}
                        aria-invalid={fieldState.invalid || undefined}
                        aria-describedby={
                          fieldState.error ? errorId : undefined
                        }
                      />
                    ) : field.type === 'select' && field.options ? (
                      <Select
                        name={formField.name}
                        value={formField.value}
                        onValueChange={formField.onChange}
                        disabled={submitting || disabled}
                      >
                        <SelectTrigger
                          ref={formField.ref}
                          id={fieldId}
                          className='w-full'
                          aria-required={!!field.rules?.required || undefined}
                          aria-invalid={fieldState.invalid || undefined}
                          aria-describedby={
                            fieldState.error ? errorId : undefined
                          }
                        >
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
                    {fieldState.error && (
                      <p
                        id={errorId}
                        role='alert'
                        className='mt-1 text-xs text-destructive'
                      >
                        {String(fieldState.error.message ?? '')}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          );
        })}
        <Button
          className='h-11 w-full'
          type='submit'
          size='sm'
          variant='accent'
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
                {resolvedDangerZoneMessage}
              </p>
              <div className='flex gap-2'>
                <Button
                  className='mt-4'
                  size='sm'
                  variant='destructive'
                  onClick={deleteItem}
                  loading={deleteItemLoading}
                  disabled={disabled || deleteButtonDisabled}
                >
                  {deleteButtonLabel ??
                    dict.common.deleteNamed.replace('{item}', resolvedItemName)}
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
