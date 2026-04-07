'use client';

import { useCallback, useState } from 'react';

import { TbDownload, TbPlus, TbTrash, TbUpload } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface MetadataEditorProps {
  /** Current metadata key-value pairs */
  value: Record<string, string>;
  /** Callback when metadata changes */
  onChange: (metadata: Record<string, string>) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A key-value editor for embedding metadata.
 * Supports adding/removing fields and JSON import/export.
 */
export function MetadataEditor({
  value,
  onChange,
  disabled = false,
  className = '',
}: MetadataEditorProps) {
  const { dict } = useLocale();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Validate key - alphanumeric, underscore, hyphen only
  const isValidKey = (key: string): boolean => {
    if (!key) return false;
    return /^[a-zA-Z0-9_-]+$/.test(key);
  };

  const handleAddField = useCallback(() => {
    if (!newKey.trim()) {
      setKeyError('Key is required');
      return;
    }
    if (!isValidKey(newKey)) {
      setKeyError('Key must be alphanumeric (a-z, 0-9, _, -)');
      return;
    }
    if (Object.hasOwn(value, newKey)) {
      setKeyError('Key already exists');
      return;
    }

    setKeyError(null);
    onChange({
      ...value,
      [newKey]: newValue,
    });
    setNewKey('');
    setNewValue('');
  }, [newKey, newValue, value, onChange]);

  const handleRemoveField = useCallback(
    (key: string) => {
      const newMetadata = { ...value };
      delete newMetadata[key];
      onChange(newMetadata);
    },
    [value, onChange]
  );

  const handleUpdateValue = useCallback(
    (key: string, newVal: string) => {
      onChange({
        ...value,
        [key]: newVal,
      });
    },
    [value, onChange]
  );

  const handleImportJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Validate structure - must be a flat object with string values
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error('JSON must be a flat object');
        }

        const newMetadata: Record<string, string> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (!isValidKey(key)) {
            throw new Error(
              `Invalid key "${key}": keys must be alphanumeric (a-z, 0-9, _, -)`
            );
          }
          if (val === null || val === undefined) {
            throw new Error(
              `Invalid value for key "${key}": null and undefined are not allowed`
            );
          }
          if (typeof val === 'object') {
            throw new Error(
              `Invalid value for key "${key}": nested objects and arrays are not allowed. Values must be strings, numbers, or booleans`
            );
          }
          newMetadata[key] = String(val);
        }

        setImportError(null);
        onChange({ ...value, ...newMetadata });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import JSON';
        setImportError(message);
      }
    };
    input.click();
  }, [value, onChange]);

  const handleExportJson = useCallback(() => {
    const json = JSON.stringify(value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [value]);

  const entries = Object.entries(value);

  return (
    <div
      className={`
        flex flex-col gap-4
        ${className}
      `}
    >
      {/* Header with import/export buttons */}
      <div className='flex items-center justify-between'>
        <Label className='text-sm font-medium'>
          {dict.repository.objects.embeddingsMetadata}
        </Label>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleImportJson}
            disabled={disabled}
            icon={<TbUpload className='size-4' />}
          >
            {dict.repository.objects.embeddingsMetadataImportJson}
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleExportJson}
            disabled={disabled || entries.length === 0}
            icon={<TbDownload className='size-4' />}
          >
            {dict.repository.objects.embeddingsMetadataExportJson}
          </Button>
        </div>
      </div>

      {/* Import error */}
      {importError && <p className='text-xs text-destructive'>{importError}</p>}

      {/* Existing fields */}
      {entries.length > 0 && (
        <div className='flex flex-col gap-2'>
          {entries.map(([key, val]) => (
            <div key={key} className='flex items-center gap-2'>
              <Input
                value={key}
                disabled
                className='w-40 bg-muted/50 font-mono text-sm'
                placeholder={dict.repository.objects.embeddingsMetadataKey}
              />
              <Input
                value={val}
                onChange={(e) => handleUpdateValue(key, e.target.value)}
                disabled={disabled}
                className='flex-1'
                placeholder={dict.repository.objects.embeddingsMetadataValue}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => handleRemoveField(key)}
                disabled={disabled}
                aria-label='Remove entry'
                className={`
                  text-destructive
                  hover:text-destructive
                `}
              >
                <TbTrash className='size-4' />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new field */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Input
            value={newKey}
            onChange={(e) => {
              setNewKey(e.target.value);
              setKeyError(null);
            }}
            disabled={disabled}
            className='w-40 font-mono text-sm'
            placeholder={dict.repository.objects.embeddingsMetadataKey}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddField();
              }
            }}
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={disabled}
            className='flex-1'
            placeholder={dict.repository.objects.embeddingsMetadataValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddField();
              }
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={handleAddField}
            disabled={disabled || !newKey.trim()}
            aria-label='Add entry'
          >
            <TbPlus className='size-4' />
          </Button>
        </div>
        {keyError && <p className='text-xs text-destructive'>{keyError}</p>}
      </div>

      {/* Empty state */}
      {entries.length === 0 && !newKey && (
        <p className='text-sm text-muted-foreground'>
          No metadata fields. Add a key-value pair above.
        </p>
      )}
    </div>
  );
}
