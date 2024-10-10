'use client';

import { forwardRef } from 'react';

import ReactSelect, { MultiValue, SingleValue } from 'react-select';

import { Checkbox } from '@/components/ui/checkbox';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { DynamicField } from '@/types/internal/DynamicField';

// Define a custom type for ReactSelect options
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
    fieldProps,
  }: {
    field: DynamicField;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldProps?: any;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: React.Ref<any>
) {
  const { dict } = useLocale();

  const options: SelectOption[] =
    field.options?.map((option) => ({
      value: option.key,
      label: option.value,
    })) ?? [];

  // Map fieldProps.value to the corresponding option(s) for ReactSelect
  const getSelectedOption = () => {
    if (field.multiple) {
      return options.filter((option) =>
        (fieldProps.value ?? []).includes(option.value)
      );
    } else {
      return (
        options.find((option) => option.value === fieldProps.value) || null
      );
    }
  };

  // Render the appropriate input type based on the field's type
  const renderField = () => {
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
            {...fieldProps}
          />
        );
      case 'textarea':
        return (
          <Input
            type='text'
            longtext={{ rows: 3 }}
            placeholder={field.example}
            ref={ref}
            {...fieldProps}
          />
        );
      case 'checkbox':
        return (
          <div className='flex flex-row items-center'>
            <Checkbox
              checked={fieldProps.value || false}
              ref={ref}
              {...fieldProps}
            />
            <Label>{field.label}</Label>
          </div>
        );
      case 'select':
        return (
          <ReactSelect
            {...fieldProps}
            value={getSelectedOption()}
            placeholder={field.label}
            isMulti={field.multiple}
            isLoading={false}
            onChange={(
              selectedOption:
                | SingleValue<SelectOption>
                | MultiValue<SelectOption>
            ) => {
              const value = field.multiple
                ? (selectedOption as MultiValue<SelectOption>).map(
                    (option) => option.value
                  )
                : ((selectedOption as SingleValue<SelectOption>)?.value ?? '');
              fieldProps?.onChange?.(value);
            }}
            options={options}
            noOptionsMessage={() => dict.misc.noOptionsMessage}
            className='react-select-container'
            classNamePrefix='react-select'
            ref={ref}
          />
        );
      case 'radio':
        return (
          <>
            {field.options?.map((option) => (
              <label key={option.key} className='mb-1 flex items-center'>
                <Input
                  type='radio'
                  value={option.value}
                  className='mr-2'
                  checked={fieldProps.value === option.value}
                  ref={ref}
                  {...fieldProps}
                />
                {option.value}
              </label>
            ))}
          </>
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
            {...fieldProps}
          />
        );
      case 'file':
        return (
          <Input
            type='file'
            multiple={field.multiple}
            ref={ref}
            {...fieldProps}
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
            {...fieldProps}
          />
        );
    }
  };

  return (
    <div id='dynamic-form-field' className='mb-2 flex flex-col gap-1'>
      {field.type !== 'checkbox' && (
        <Label>
          {field.label}
          {field.required && <span className='ml-2 text-red-500'>*</span>}
        </Label>
      )}
      {renderField()}
      {field.help_text && (
        <p className='pl-1 text-xs text-gray-400'>{field.help_text}</p>
      )}
    </div>
  );
}

export default forwardRef(DynamicFormField);
