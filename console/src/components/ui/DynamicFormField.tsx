'use client';

import { forwardRef, useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { DynamicField } from '@/types/internal/DynamicField';

// Define a custom type for select options
type SelectOption = {
  value: string;
  label: string;
};

/**
 * Component to render a dynamic form field based on the field type
 * @param props - Dynamic field object and field properties to pass to the input
 * @param ref - React ref for the field
 * @returns JSX.Element
 */
function DynamicFormField(
  {
    field,
    disabled = false,
    fieldProps,
    hasError = false,
    fieldId,
    errorId,
  }: {
    field: DynamicField;
    disabled?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldProps?: any;
    hasError?: boolean;
    fieldId: string;
    errorId: string;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: React.Ref<any>
) {
  const labelId = `${fieldId}-label`;
  const helpTextId = `${fieldId}-help`;
  const describedBy =
    [field.help_text ? helpTextId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const isGroupedField =
    field.type === 'radio' || (field.type === 'select' && field.multiple);

  const options: SelectOption[] = useMemo(
    () =>
      field.options?.map((option) => ({
        value: option.key,
        label: option.value,
      })) ?? [],
    [field.options]
  );

  // Render the appropriate input type based on the field's type
  const fieldElement = useMemo(() => {
    // Handle secret text areas separately to ensure they are rendered as such
    if (field.secret && field.type === 'textarea') {
      return (
        <Input
          type='password'
          longtext={{ rows: 3 }}
          placeholder={field.example}
          ref={ref}
          disabled={disabled}
          {...fieldProps}
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          aria-required={field.required || undefined}
        />
      );
    }

    if (field.secret) {
      return (
        <Input
          type='password'
          placeholder={field.example}
          ref={ref}
          disabled={disabled}
          {...fieldProps}
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          aria-required={field.required || undefined}
        />
      );
    }

    switch (field.type) {
      case 'integer':
      case 'float':
        return (
          <Input
            type='number'
            placeholder={field.example}
            min={field.min ? (field.min as number) : undefined}
            max={field.max ? (field.max as number) : undefined}
            ref={ref}
            disabled={disabled}
            {...fieldProps}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        );
      case 'textarea':
        return (
          <Input
            type='text'
            longtext={{ rows: 3 }}
            placeholder={field.example}
            ref={ref}
            disabled={disabled}
            {...fieldProps}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        );
      case 'checkbox':
        return (
          <div className='flex flex-row items-center gap-2'>
            <Checkbox
              checked={fieldProps.value || false}
              ref={ref}
              disabled={disabled}
              {...fieldProps}
              id={fieldId}
              name={fieldProps?.name}
              aria-describedby={describedBy}
              aria-invalid={hasError || undefined}
              aria-required={field.required || undefined}
            />
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && (
                <span aria-hidden='true' className='ml-2 text-destructive'>
                  *
                </span>
              )}
            </Label>
          </div>
        );
      case 'select':
        if (field.multiple) {
          // For multiple select, we'll need to implement a custom multi-select component
          // For now, we'll use a simple checkbox list
          return (
            <div
              id={fieldId}
              role='group'
              aria-labelledby={labelId}
              aria-describedby={describedBy}
              className='flex flex-col gap-2'
            >
              {options.map((option, index) => {
                const optionId = `${fieldId}-option-${index}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className='flex items-center gap-2'
                  >
                    <Checkbox
                      ref={index === 0 ? (fieldProps?.ref ?? ref) : undefined}
                      id={optionId}
                      name={fieldProps?.name}
                      value={option.value}
                      checked={(fieldProps.value ?? []).includes(option.value)}
                      onCheckedChange={(checked) => {
                        const currentValues = fieldProps.value ?? [];
                        const newValues = checked
                          ? [...currentValues, option.value]
                          : currentValues.filter(
                              (v: string) => v !== option.value
                            );
                        fieldProps?.onChange?.(newValues);
                      }}
                      disabled={disabled}
                      aria-invalid={hasError || undefined}
                      aria-required={field.required || undefined}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          );
        }
        return (
          <Select
            value={fieldProps.value}
            onValueChange={fieldProps?.onChange}
            disabled={disabled}
            name={fieldProps?.name}
          >
            <SelectTrigger
              id={fieldId}
              className='w-full'
              aria-describedby={describedBy}
              aria-invalid={hasError || undefined}
              aria-required={field.required || undefined}
            >
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <div
            id={fieldId}
            role='radiogroup'
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          >
            {field.options?.map((option, index) => {
              const optionId = `${fieldId}-option-${index}`;
              return (
                <label
                  key={option.key}
                  htmlFor={optionId}
                  className='mb-1 flex items-center'
                >
                  <Input
                    {...fieldProps}
                    id={optionId}
                    type='radio'
                    value={option.value}
                    className='mr-2'
                    checked={fieldProps.value === option.value}
                    ref={index === 0 ? (fieldProps?.ref ?? ref) : undefined}
                    disabled={disabled}
                    name={fieldProps?.name}
                  />
                  {option.value}
                </label>
              );
            })}
          </div>
        );
      case 'date':
      case 'time':
      case 'datetime':
        return (
          <Input
            type={
              field.type === 'date'
                ? 'date'
                : field.type === 'time'
                  ? 'time'
                  : 'datetime-local'
            }
            placeholder={field.example}
            min={field.min ? (field.min as string) : undefined}
            max={field.max ? (field.max as string) : undefined}
            ref={ref}
            disabled={disabled}
            {...fieldProps}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        );
      case 'file':
        return (
          <Input
            type='file'
            multiple={field.multiple}
            ref={ref}
            disabled={disabled}
            {...fieldProps}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        );
      case 'password':
      case 'text':
      default:
        return (
          <Input
            type={
              field.type === 'password'
                ? 'password'
                : field.type === 'email'
                  ? 'email'
                  : 'text'
            }
            placeholder={field.example}
            ref={ref}
            disabled={disabled}
            {...fieldProps}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        );
    }
  }, [
    describedBy,
    disabled,
    field,
    fieldId,
    fieldProps,
    hasError,
    labelId,
    options,
    ref,
  ]);

  return (
    <div
      id={`${fieldId}-container`}
      className={`
        mb-2 flex flex-col gap-2
        ${
          hasError
            ? `
              [&_button[role=combobox]]:border-destructive
              [&_input]:border-destructive
              [&_textarea]:border-destructive
            `
            : ''
        }
      `}
    >
      {field.type !== 'checkbox' && (
        <Label id={labelId} htmlFor={isGroupedField ? undefined : fieldId}>
          {field.label}
          {field.required && (
            <span aria-hidden='true' className='ml-2 text-destructive'>
              *
            </span>
          )}
        </Label>
      )}
      {fieldElement}
      {field.help_text && (
        <p id={helpTextId} className='pl-1 text-xs text-muted-foreground'>
          {field.help_text}
        </p>
      )}
    </div>
  );
}

export default forwardRef(DynamicFormField);
