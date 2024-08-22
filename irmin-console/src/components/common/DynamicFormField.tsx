import React from 'react';

import Input from '@/components/common/form/Input';
import Select from '@/components/common/select/Select';

import {
  DynamicField,
  DynamicFieldValues,
  FieldValue,
} from '@/types/internal/DynamicField';

/**
 * Component to render a dynamic form field based on the field type
 * @param field - Dynamic field object
 * @returns JSX.Element
 */
export default function DynamicFormField({
  name,
  field,
  values,
  updateValues,
}: {
  name: string;
  field: DynamicField;
  values: DynamicFieldValues | null;
  updateValues: (key: string, value: FieldValue | FieldValue[]) => void;
}) {
  const renderField = () => {
    switch (field.type) {
      case 'integer':
      case 'float':
        return (
          <Input
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type={'number'}
            defaultValue={field.default as string}
            placeholder={field.example}
            required={field.required}
            name={name}
            min={field.min ? (field.min as number) : undefined}
            max={field.max ? (field.max as number) : undefined}
            onChange={(e) => updateValues(name, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Input
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type={'text'}
            longtext={{ rows: 3 }}
            defaultValue={field.default as string}
            placeholder={field.example}
            required={field.required}
            name={name}
            onChange={(e) => updateValues(name, e.target.value)}
          />
        );
      case 'checkbox':
        return (
          <label className='mb-1 flex items-center'>
            <input
              type='checkbox'
              defaultChecked={
                typeof field.default === 'boolean' && field.default
              }
              required={field.required}
              name={name}
              className='mr-2'
              onChange={(e) => updateValues(name, e.target.checked)}
            />
            {field.label}
          </label>
        );
      case 'select':
        return (
          <Select
            label={field.label}
            defaultValue={field.default as string}
            required={field.required}
            multiple={field.multiple}
            loading={false}
            name={name}
            onChange={(e) => updateValues(name, e.target.value)}
            options={
              field.options?.map((option) => ({
                value: option.key,
                label: option.value,
              })) ?? []
            }
          />
        );
      case 'radio':
        return (
          <>
            {field.options?.map((option) => (
              <label key={option.key} className='mb-1 flex items-center'>
                <input
                  type='radio'
                  value={option.value}
                  defaultChecked={field.default === option.value}
                  required={field.required}
                  name={name}
                  className='mr-2'
                  onChange={(e) => updateValues(name, e.target.value)}
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
            defaultValue={field.default as string}
            placeholder={field.example}
            required={field.required}
            name={name}
            min={field.min ? (field.min as string) : undefined}
            max={field.max ? (field.max as string) : undefined}
            onChange={(e) => updateValues(name, e.target.value)}
          />
        );
      case 'file':
        return (
          <Input
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            type='file'
            required={field.required}
            multiple={field.multiple}
            name={name}
            onChange={() => {
              // TODO: Convert to base64 and store in state
            }}
          />
        );
      case 'password':
      case 'text':
      default:
        return (
          <Input
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
            defaultValue={field.default as string}
            placeholder={field.example}
            required={field.required}
            name={name}
            onChange={(e) => updateValues(name, e.target.value)}
          />
        );
    }
  };

  if (field.required_with && field.required_with.length > 0) {
    const requiredWith = field.required_with;
    const requiredWithFields = requiredWith.map((key) => {
      if (values && typeof values[key] === 'boolean') {
        return values[key];
      } else {
        return false;
      }
    });
    if (!requiredWithFields.includes(true)) {
      return null;
    }
  }

  return (
    <div className='my-4 border-b pb-4'>
      {field.type !== 'checkbox' && (
        <label className='mb-1 block'>
          {field.label}
          {field.required && <span className='ml-2 text-red-500'>*</span>}
        </label>
      )}
      {renderField()}
      {field.help_text && (
        <p className='mt-2 text-xs text-gray-400'>{field.help_text}</p>
      )}
    </div>
  );
}
