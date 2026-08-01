import type { ConnectionFieldValues } from '@/types/core/Connection';
import type {
  DynamicField,
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

/**
 * Placeholder that the API returns in place of a stored secret. Sending the
 * same placeholder back on PATCH preserves the stored value server-side.
 */
const SECRET_PLACEHOLDER = 'SECRET';

/**
 * Whether any value equals {@link SECRET_PLACEHOLDER} — i.e. the user has
 * left a stored secret untouched. The backend only returns the placeholder
 * for fields flagged `secret`, so a values-only check is sufficient.
 */
export function hasUnchangedSecrets(
  values: DynamicFieldValues | undefined
): boolean {
  if (!values) {
    return false;
  }
  for (const value of Object.values(values)) {
    if (value === SECRET_PLACEHOLDER) {
      return true;
    }
  }
  return false;
}

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
  values?: DynamicFieldValues,
  options?: { secretHelpText?: string }
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

    // When editing, the API returns SECRET_PLACEHOLDER for stored secrets.
    // Pre-filling that placeholder lets the user keep the stored value (PATCH
    // treats it as "no change") while making the input non-empty so the
    // password field renders masked dots as an "already set" signal.
    const isStoredSecret =
      field.secret &&
      rawValue === SECRET_PLACEHOLDER &&
      options?.secretHelpText;

    populated[key] = {
      ...field,
      default: defaultValue,
      help_text: isStoredSecret
        ? field.help_text
          ? `${field.help_text} — ${options?.secretHelpText}`
          : options?.secretHelpText
        : field.help_text,
    };
  }

  return populated;
}
