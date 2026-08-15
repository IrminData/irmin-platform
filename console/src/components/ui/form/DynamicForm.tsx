'use client';

import type { FormHTMLAttributes } from 'react';
import { useCallback, useId, useMemo } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import DynamicFormField from '@/components/ui/DynamicFormField';

import { useLocale } from '@/context/LocaleContext';

import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

const toDomId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

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
  onSubmit: (_data: DynamicFieldValues) => void;
  submitButtonText: string;
  formProps?: FormHTMLAttributes<HTMLFormElement>;
  loading?: boolean;
}) {
  const { dict } = useLocale();
  const generatedFormId = useId();
  const formId = formProps?.id ?? `dynamic-form-${toDomId(generatedFormId)}`;
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

  // Sort fields to ensure consistent ordering
  const sortedFields = useCallback(() => {
    const entries = Object.entries(fields);

    // Sort by field importance: required fields first, then by type priority
    const getFieldPriority = (field: DynamicFields[string]) => {
      const typePriority: Record<string, number> = {
        text: 1,
        email: 2,
        password: 3,
        integer: 4,
        float: 5,
        select: 6,
        radio: 7,
        checkbox: 8,
        date: 9,
        datetime: 10,
        time: 11,
        textarea: 12,
        file: 13,
      };

      const typeScore = typePriority[field.type] || 100;
      const requiredScore = field.required ? 0 : 1000;

      return requiredScore + typeScore;
    };

    return entries.sort((a, b) => {
      const priorityA = getFieldPriority(a[1]);
      const priorityB = getFieldPriority(b[1]);
      return priorityA - priorityB;
    });
  }, [fields]);

  const fieldsElement = useMemo(() => {
    return sortedFields().map(([key, field], index) => {
      const fieldId = `${formId}-${toDomId(key)}-${index}`;
      const errorId = `${fieldId}-error`;

      return (
        <div key={key}>
          <Controller
            name={key}
            control={control}
            rules={{
              required: field.required
                ? dict.common.fieldRequiredNamed.replace('{field}', field.label)
                : false,
              min:
                field.min !== undefined
                  ? {
                      value: Number(field.min),
                      message: dict.common.fieldMinimum.replace(
                        '{value}',
                        String(field.min)
                      ),
                    }
                  : undefined,
              max:
                field.max !== undefined
                  ? {
                      value: Number(field.max),
                      message: dict.common.fieldMaximum.replace(
                        '{value}',
                        String(field.max)
                      ),
                    }
                  : undefined,
              validate: {
                ...(field.required_with && {
                  requiredWith: (value) => {
                    const otherValues = getValues(field.required_with!);
                    const anyOtherFieldFilled = Object.values(otherValues).some(
                      (val) => !!val
                    );
                    if (anyOtherFieldFilled && !value) {
                      return dict.common.fieldRequiredWith.replace(
                        '{field}',
                        field.label
                      );
                    }
                    return true;
                  },
                }),
                ...(field.type === 'email' && {
                  email: (value) => {
                    if (!value) return true; // Allow empty unless required
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return (
                      emailRegex.test(String(value)) ||
                      dict.common.fieldInvalidEmail
                    );
                  },
                }),
                ...(field.type === 'integer' && {
                  integer: (value) => {
                    if (!value) return true;
                    const isInteger = Number.isInteger(Number(value));
                    return isInteger || dict.common.fieldInvalidInteger;
                  },
                }),
                ...(field.type === 'float' && {
                  float: (value) => {
                    if (!value) return true;
                    const isNumber = !isNaN(Number(value));
                    return isNumber || dict.common.fieldInvalidNumber;
                  },
                }),
              },
            }}
            render={({ field: fieldProps, fieldState }) => (
              <>
                <DynamicFormField
                  field={field}
                  fieldProps={fieldProps}
                  hasError={!!fieldState.error}
                  fieldId={fieldId}
                  errorId={errorId}
                />
                {fieldState.error && (
                  <p
                    id={errorId}
                    role='alert'
                    className='mt-1 pl-1 text-xs text-destructive'
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>
      );
    });
  }, [control, dict.common, formId, getValues, sortedFields]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      id={formId}
      className='my-4 flex flex-col gap-2'
      {...formProps}
    >
      {fieldsElement}
      {Object.keys(errors).length > 0 && (
        <p className='w-full text-center text-destructive'>
          {dict.common.pleaseFixErrors}
        </p>
      )}
      <Button
        type='submit'
        variant='accent'
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
