'use client';

import { FormHTMLAttributes, useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import DynamicFormField from '@/components/ui/DynamicFormField';

import { useLocale } from '@/context/LocaleContext';

import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

/**
 * Component to render a dynamic form based on the provided fields.
 * It uses react-hook-form for form state management and validation.
 *
 * @param props - Component properties.
 * @param props.fields - An object containing dynamic field definitions.
 * @param props.onSubmit - Function to handle form submission.
 * @param props.submitButtonText - Text to display on the submit button.
 * @param props.formProps - Additional form attributes.
 * @param props.loading - Boolean indicating if the form is in a loading state.
 */
export default function DynamicForm({
  fields,
  onSubmit,
  submitButtonText,
  formProps,
  loading = false,
}: {
  fields: DynamicFields;
  onSubmit: (data: DynamicFieldValues) => void;
  submitButtonText: string;
  formProps?: FormHTMLAttributes<HTMLFormElement>;
  loading?: boolean;
}) {
  const { dict } = useLocale();
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<DynamicFieldValues>({
    defaultValues: Object.keys(fields).reduce((acc, key) => {
      acc[key] = fields[key].default ?? '';
      return acc;
    }, {} as DynamicFieldValues),
  });

  const renderFields = useCallback(() => {
    return Object.entries(fields).map(([key, field]) => (
      <div key={key}>
        <Controller
          name={key}
          control={control}
          rules={{
            required: field.required ? `${field.label} is required` : false,
            min:
              field.min !== undefined
                ? {
                    value: Number(field.min),
                    message: `Minimum value is ${field.min}`,
                  }
                : undefined,
            max:
              field.max !== undefined
                ? {
                    value: Number(field.max),
                    message: `Maximum value is ${field.max}`,
                  }
                : undefined,
            validate: field.required_with
              ? (value) => {
                  const otherValues = getValues(field.required_with!);
                  const anyOtherFieldFilled = Object.values(otherValues).some(
                    (val) => !!val
                  );
                  if (anyOtherFieldFilled && !value) {
                    return `${field.label} is required`;
                  }
                  return true;
                }
              : undefined,
          }}
          render={({ field: fieldProps, fieldState }) => (
            <>
              <DynamicFormField field={field} fieldProps={fieldProps} />
              {fieldState.error && (
                <p className='mt-1 pl-1 text-xs text-red-500'>
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>
    ));
  }, [control, getValues, fields]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      id='dynamic-form'
      className='my-4 flex flex-col gap-2'
      {...formProps}
    >
      {renderFields()}
      {Object.keys(errors).length > 0 && (
        <p className='w-full text-center text-red-500'>
          {dict.common.pleaseFixErrors}
        </p>
      )}
      <Button
        type='submit'
        variant='default'
        size='lg'
        loading={loading || isSubmitting}
        className='w-full'
      >
        {submitButtonText}
      </Button>
      <Button
        type='button'
        onClick={() => reset()}
        disabled={loading || isSubmitting}
        variant='ghost'
        className='w-full'
      >
        {dict.common.resetForm}
      </Button>
    </form>
  );
}
