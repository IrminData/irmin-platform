'use client';

import { useId, useState } from 'react';

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
  const editorId = useId();
  const errorId = `${editorId}-error`;

  // Sync jsonString when value prop changes from parent during render.
  // Only update if the content actually differs to avoid reformatting during user typing.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const formatted = JSON.stringify(value, null, 2);
      try {
        const currentParsed = JSON.parse(jsonString);
        const newParsed = JSON.parse(formatted);
        if (JSON.stringify(currentParsed) !== JSON.stringify(newParsed)) {
          setJsonString(formatted);
        }
      } catch {
        setJsonString(formatted);
      }
    } else if (jsonString !== '{}') {
      setJsonString('{}');
    }
  }

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
      <label className='sr-only' htmlFor={editorId}>
        {dict.schemaBuilder.rawJson}
      </label>
      <textarea
        id={editorId}
        className={`
          min-h-[400px] w-full rounded-[2px] border border-input bg-background
          px-3 py-2 font-mono text-base ring-offset-background
          placeholder:text-muted-foreground
          focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 focus-visible:outline-none
          disabled:cursor-not-allowed disabled:opacity-50
          md:text-sm
          ${error ? 'border-destructive' : ''}
        `}
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role='alert' className='text-sm text-destructive'>
          {dict.schemaBuilder.invalidJson}: {error}
        </p>
      )}
    </div>
  );
}
