'use client';

import { forwardRef } from 'react';

import ReactSelect, { MultiValue, SingleValue } from 'react-select';

import Input from '@/components/common/form/Input';

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
            {...fieldProps}
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type='number'
            placeholder={field.example}
            min={field.min ? (field.min as number) : undefined}
            max={field.max ? (field.max as number) : undefined}
            ref={ref}
          />
        );
      case 'textarea':
        return (
          <Input
            {...fieldProps}
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type='text'
            longtext={{ rows: 3 }}
            placeholder={field.example}
            ref={ref}
          />
        );
      case 'checkbox':
        return (
          <label className='mb-1 flex items-center'>
            <input
              {...fieldProps}
              type='checkbox'
              className='mr-2'
              checked={fieldProps.value || false}
              ref={ref}
            />
            {field.label}
          </label>
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
                <input
                  {...fieldProps}
                  type='radio'
                  value={option.value}
                  className='mr-2'
                  checked={fieldProps.value === option.value}
                  ref={ref}
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
            {...fieldProps}
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
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
          />
        );
      case 'file':
        return (
          <Input
            {...fieldProps}
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type='file'
            multiple={field.multiple}
            ref={ref}
          />
        );
      case 'password':
      case 'text':
      default:
        return (
          <Input
            {...fieldProps}
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type={
              field.type === 'password'
                ? 'password'
                : field.type === 'email'
                  ? 'email'
                  : 'text'
            }
            placeholder={field.example}
            ref={ref}
          />
        );
    }
  };

  return (
    <div id='dynamic-form-field'>
      {field.type !== 'checkbox' && (
        <label className='pl-1 dark:text-gray-400'>
          {field.label}
          {field.required && <span className='ml-2 text-red-500'>*</span>}
        </label>
      )}
      {renderField()}
      {field.help_text && (
        <p className='mt-1 pl-1 text-xs text-gray-400'>{field.help_text}</p>
      )}
    </div>
  );
}

export default forwardRef(DynamicFormField);
