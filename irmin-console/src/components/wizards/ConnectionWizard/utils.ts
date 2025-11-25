import type { ConnectionFieldValues } from '@/types/core/Connection';
import type {
  DynamicField,
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

export function convertConnectionValuesToDynamicValues(
  values?: ConnectionFieldValues
): DynamicFieldValues {
  const dynamicValues: DynamicFieldValues = {};

  if (!values) {
    return dynamicValues;
  }

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }
    dynamicValues[key] = value;
  }

  return dynamicValues;
}

const normalizeValueForField = (
  field: DynamicField,
  value: DynamicFieldValues[string] | string | undefined
) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  const valueAsString = String(value);

  switch (field.type) {
    case 'checkbox':
      return valueAsString.toLowerCase() === 'true';
    case 'integer': {
      if (valueAsString.trim() === '') {
        return undefined;
      }
      const parsed = Number(valueAsString);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case 'float': {
      if (valueAsString.trim() === '') {
        return undefined;
      }
      const parsed = Number(valueAsString);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case 'select':
      if (field.multiple) {
        if (valueAsString.trim() === '') {
          return [];
        }
        return valueAsString
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      return valueAsString;
    default:
      return valueAsString;
  }
};

export function populateFieldDefaults(
  fields?: DynamicFields,
  values?: DynamicFieldValues
): DynamicFields {
  if (!fields) {
    return {};
  }

  const populated: DynamicFields = {};

  for (const [key, field] of Object.entries(fields)) {
    const rawValue = values?.[key];
    const defaultValue =
      rawValue === undefined
        ? field.default
        : normalizeValueForField(field, rawValue);
    const shouldOmitDefault = field.secret && rawValue !== undefined;

    populated[key] = {
      ...field,
      default: shouldOmitDefault ? undefined : defaultValue,
    };
  }

  return populated;
}
