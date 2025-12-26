'use client';

import { useEffect, useState } from 'react';

import { useLocale } from '@/context/LocaleContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

interface RawJSONEditorProps {
  value: ObjectSchema | undefined;
  onChange: (schema: ObjectSchema) => void;
  disabled?: boolean;
}

export default function RawJSONEditor({
  value,
  onChange,
  disabled,
}: RawJSONEditorProps) {
  const { dict } = useLocale();
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync jsonString when value prop changes from parent
    // Only update if the content actually differs to avoid reformatting during user typing
    if (value) {
      const formatted = JSON.stringify(value, null, 2);
      try {
        const currentParsed = JSON.parse(jsonString);
        const newParsed = JSON.parse(formatted);

        // Only update if the parsed objects are different
        if (JSON.stringify(currentParsed) !== JSON.stringify(newParsed)) {
          setJsonString(formatted);
        }
      } catch {
        // If current jsonString is invalid, update it
        setJsonString(formatted);
      }
    } else {
      if (jsonString !== '{}') {
        setJsonString('{}');
      }
    }
  }, [value, jsonString]);

  const handleChange = (newValue: string) => {
    setJsonString(newValue);
    try {
      const parsed = JSON.parse(newValue);

      // Basic validation to match ObjectSchema type
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('Root must be an object');
      }

      if (typeof parsed.name !== 'string') {
        throw new Error('Property "name" is required and must be a string');
      }

      if (typeof parsed.path !== 'string') {
        throw new Error('Property "path" is required and must be a string');
      }

      if (!['group', 'structured', 'binary'].includes(parsed.type)) {
        throw new Error(
          'Property "type" must be one of: group, structured, binary'
        );
      }

      setError(null);
      onChange(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <textarea
        className={`
          min-h-[400px] w-full rounded-md border border-input bg-background px-3
          py-2 font-mono text-sm ring-offset-background
          placeholder:text-muted-foreground
          focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 focus-visible:outline-none
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-red-500' : ''}
        `}
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
      {error && (
        <p className='text-sm text-red-500'>
          {dict.schemaBuilder.invalidJson}: {error}
        </p>
      )}
    </div>
  );
}
