'use client';

import { useEffect, useState } from 'react';

import {
  TbChevronDown,
  TbChevronRight,
  TbPlus,
  TbSettings,
  TbTrash,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
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

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

import type { JSONSchema } from '@/types/core/ObjectSchema';

interface PropertyEditorProps {
  name: string;
  schema: JSONSchema;
  isRequired: boolean;
  onChange: (name: string, schema: JSONSchema, required: boolean) => void;
  onDelete: () => void;
  disabled?: boolean;
}

function PropertyEditor({
  name,
  schema,
  isRequired,
  onChange,
  onDelete,
  disabled,
}: PropertyEditorProps) {
  const { dict } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Local state for name to allow typing intermediate invalid states
  const [localName, setLocalName] = useState(name);

  // Sync local state when prop changes (e.g. from parent re-render or initial load)
  useEffect(() => {
    setLocalName(name);
  }, [name]);

  const handleNameBlur = () => {
    if (localName !== name) {
      // Attempt to rename
      onChange(localName, schema, isRequired);
      // Immediately revert local state to the current prop 'name'.
      // If the parent accepts the change, it will re-render this component with the new 'name',
      // and the useEffect will update localName to the new value.
      // If the parent rejects the change (e.g. duplicate), no re-render happens,
      // and this ensures the input reverts to the valid name instead of staying in an invalid state.
      setLocalName(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Common types supported by JSON Schema
  const types = [
    'string',
    'number',
    'integer',
    'boolean',
    'object',
    'array',
    'null',
  ];

  // Common formats for string type
  const formats = [
    'email',
    'uri',
    'date',
    'date-time',
    'time',
    'uuid',
    'hostname',
    'ipv4',
    'ipv6',
  ];

  const updateSchema = (updates: Partial<JSONSchema>) => {
    onChange(name, { ...schema, ...updates }, isRequired);
  };

  const handleTypeChange = (newType: JSONSchema['type']) => {
    // Create a new schema object to ensure we don't keep invalid properties
    const newSchema: JSONSchema = {
      ...schema,
      type: newType,
    };

    // Explicitly remove type-specific properties that are no longer valid
    if (newType !== 'object') {
      delete newSchema.properties;
      delete newSchema.required;
      delete newSchema.additionalProperties;
    }
    if (newType !== 'array') {
      delete newSchema.items;
      delete newSchema.minItems;
      delete newSchema.maxItems;
    } else if (newType === 'array' && !newSchema.items) {
      // Initialize items with default type 'string' when changing to array
      // This matches what the UI displays and ensures proper validation
      newSchema.items = { type: 'string' };
    }
    if (newType !== 'string') {
      delete newSchema.format;
      delete newSchema.pattern;
      delete newSchema.minLength;
      delete newSchema.maxLength;
      delete newSchema.contentEncoding;
      delete newSchema.contentMediaType;
    }
    if (newType !== 'number' && newType !== 'integer') {
      delete newSchema.minimum;
      delete newSchema.maximum;
    }

    onChange(name, newSchema, isRequired);
  };

  return (
    <div
      className={cn(
        `
          group flex flex-col border-b border-border/50
          last:border-0
        `,
        disabled && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-md py-0.5 pr-2 pl-1',
          `
            transition-colors
            hover:bg-muted/50
          `
        )}
      >
        <div className='flex size-6 items-center justify-center'>
          {(schema.type === 'object' || schema.type === 'array') && (
            <Button
              variant='ghost'
              size='sm'
              className={`
                size-5 p-0 text-muted-foreground
                hover:text-foreground
              `}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <TbChevronDown className='size-3' />
              ) : (
                <TbChevronRight className='size-3' />
              )}
            </Button>
          )}
        </div>

        <div className='flex flex-1 items-center gap-2'>
          <Input
            id={`property-name-input-${name}`}
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-7 min-w-32 flex-1 font-mono text-xs',
              `
                bg-transparent
                hover:bg-background
                focus:bg-background
              `
            )}
            placeholder='Property name'
            disabled={disabled}
          />
          <Select
            value={schema.type}
            onValueChange={handleTypeChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                'h-7 w-[100px] text-xs',
                `
                  bg-transparent
                  hover:bg-background
                  focus:bg-background
                `
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t} className='text-xs'>
                  {
                    dict.schemaBuilder.types[
                      t as keyof typeof dict.schemaBuilder.types
                    ]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div
            className='flex items-center gap-1.5'
            title={dict.schemaBuilder.required}
          >
            <Checkbox
              checked={isRequired}
              onCheckedChange={(checked) =>
                onChange(name, schema, checked === true)
              }
              disabled={disabled}
              className='size-3.5'
            />
            <span className='text-xs text-muted-foreground'>Required</span>
          </div>
        </div>

        <div
          className={`
            flex items-center gap-1 opacity-50 transition-opacity
            group-hover:opacity-100
          `}
        >
          <Button
            variant={showSettings ? 'secondary' : 'ghost'}
            size='sm'
            className='size-6 p-0'
            onClick={() => setShowSettings(!showSettings)}
            title={dict.schemaBuilder.constraints}
          >
            <TbSettings className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className={`
              size-6 p-0 text-red-500
              hover:text-red-600
            `}
            onClick={onDelete}
            disabled={disabled}
            title={dict.common.delete}
          >
            <TbTrash className='size-3.5' />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className='pr-2 pb-2 pl-8'>
          <div className='rounded-md border bg-muted/20 p-3'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <Label className='text-xs'>{dict.common.description}</Label>
                <Input
                  value={schema.description || ''}
                  onChange={(e) =>
                    updateSchema({ description: e.target.value })
                  }
                  className='h-8 text-sm'
                  disabled={disabled}
                />
              </div>

              {schema.type === 'string' && (
                <>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.format}
                    </Label>
                    <Select
                      value={schema.format || '__none__'}
                      onValueChange={(val) =>
                        updateSchema({
                          format: val === '__none__' ? undefined : val,
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className='h-8'>
                        <SelectValue placeholder='None' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__none__'>None</SelectItem>
                        {formats.map((f) => (
                          <SelectItem key={f} value={f}>
                            {dict.schemaBuilder.formats[
                              f as keyof typeof dict.schemaBuilder.formats
                            ] || f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.pattern}
                    </Label>
                    <Input
                      value={schema.pattern || ''}
                      onChange={(e) =>
                        updateSchema({ pattern: e.target.value })
                      }
                      className='h-8 font-mono text-sm'
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.minLength}
                    </Label>
                    <Input
                      type='number'
                      value={schema.minLength ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          minLength: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.maxLength}
                    </Label>
                    <Input
                      type='number'
                      value={schema.maxLength ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          maxLength: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                </>
              )}

              {(schema.type === 'number' || schema.type === 'integer') && (
                <>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.minimum}
                    </Label>
                    <Input
                      type='number'
                      value={schema.minimum ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          minimum: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.maximum}
                    </Label>
                    <Input
                      type='number'
                      value={schema.maximum ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          maximum: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                </>
              )}

              {schema.type === 'array' && (
                <>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.minItems}
                    </Label>
                    <Input
                      type='number'
                      value={schema.minItems ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          minItems: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>
                      {dict.schemaBuilder.maxItems}
                    </Label>
                    <Input
                      type='number'
                      value={schema.maxItems ?? ''}
                      onChange={(e) =>
                        updateSchema({
                          maxItems: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className='h-8 text-sm'
                      disabled={disabled}
                    />
                  </div>
                </>
              )}

              <div className='col-span-2'>
                <Label className='text-xs'>{dict.schemaBuilder.enum}</Label>
                <Input
                  value={
                    schema.enum?.map((v) => JSON.stringify(v)).join(', ') || ''
                  }
                  onChange={(e) => {
                    if (!e.target.value) {
                      updateSchema({ enum: undefined });
                      return;
                    }

                    try {
                      const parsedEnum = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                        .map((s) => {
                          try {
                            return JSON.parse(s);
                          } catch {
                            // If JSON.parse fails, treat as a plain string
                            return s;
                          }
                        });

                      updateSchema({ enum: parsedEnum });
                    } catch {
                      // If parsing fails entirely, ignore the update
                    }
                  }}
                  className='h-8 text-sm'
                  placeholder={dict.schemaBuilder.enumPlaceholder}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className='ml-3 border-l border-border/50 pl-3'>
          {schema.type === 'object' && (
            <JSONSchemaEditor
              value={schema}
              onChange={(newSchema) => onChange(name, newSchema, isRequired)}
              disabled={disabled}
              isRoot={false}
            />
          )}
          {schema.type === 'array' && (
            <div className='my-1 ml-0.5'>
              <JSONSchemaEditor
                value={schema.items || { type: 'string' }}
                onChange={(newItems) => updateSchema({ items: newItems })}
                disabled={disabled}
                isRoot={false} // Avoid root styling for array items
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface JSONSchemaEditorProps {
  value: JSONSchema;
  onChange: (schema: JSONSchema) => void;
  disabled?: boolean;
  isRoot?: boolean;
}

export default function JSONSchemaEditor({
  value,
  onChange,
  disabled,
  isRoot = true,
}: JSONSchemaEditorProps) {
  const { dict } = useLocale();

  // If we are at the root or just rendering a single type (like for array items),
  // we might want to show the type selector directly if it's not an object.
  // But typically this component is used to edit the *content* of a schema.
  // If value.type is 'object', we show properties.
  // If value.type is 'array', the parent PropertyEditor handles showing the Items editor.
  // So this component mainly handles the properties list for objects.

  const handleAddProperty = () => {
    const properties = value.properties || {};
    let counter = Object.keys(properties).length + 1;
    let newPropName = `prop_${counter}`;

    while (properties[newPropName]) {
      counter++;
      newPropName = `prop_${counter}`;
    }

    onChange({
      ...value,
      properties: {
        ...properties,
        [newPropName]: { type: 'string' },
      },
    });
  };

  const handlePropertyChange = (
    oldName: string,
    newName: string,
    newSchema: JSONSchema,
    isRequired: boolean
  ) => {
    const properties = { ...value.properties };
    const required = new Set(value.required || []);

    if (oldName !== newName) {
      // Reject empty property names
      if (!newName.trim()) {
        return;
      }
      if (properties[newName]) {
        // Name collision: do not allow rename
        return;
      }
      delete properties[oldName];
      required.delete(oldName);
      if (isRequired) {
        required.add(newName);
      }
    } else {
      if (isRequired) required.add(newName);
      else required.delete(newName);
    }

    properties[newName] = newSchema;

    onChange({
      ...value,
      properties,
      required: Array.from(required),
    });
  };

  const handleDeleteProperty = (name: string) => {
    const properties = { ...value.properties };
    const required = (value.required || []).filter((n) => n !== name);
    delete properties[name];
    onChange({
      ...value,
      properties,
      required,
    });
  };

  const handleRootTypeChange = (newType: string) => {
    const newSchema: JSONSchema = {
      ...value,
      type: newType as JSONSchema['type'],
    };

    // Explicitly remove type-specific properties that are no longer valid
    if (newType !== 'object') {
      delete newSchema.properties;
      delete newSchema.required;
      delete newSchema.additionalProperties;
    }
    if (newType !== 'array') {
      delete newSchema.items;
      delete newSchema.minItems;
      delete newSchema.maxItems;
    } else if (newType === 'array' && !newSchema.items) {
      // Initialize items with default type 'string' when changing to array
      newSchema.items = { type: 'string' };
    }
    if (newType !== 'string') {
      delete newSchema.format;
      delete newSchema.pattern;
      delete newSchema.minLength;
      delete newSchema.maxLength;
      delete newSchema.contentEncoding;
      delete newSchema.contentMediaType;
    }
    if (newType !== 'number' && newType !== 'integer') {
      delete newSchema.minimum;
      delete newSchema.maximum;
    }

    onChange(newSchema);
  };

  if (value.type !== 'object' && value.type !== 'array' && isRoot) {
    // If root is not object or array, allow changing it, or just show simple type selector
    // But typically the root of a schema IS an object or at least starts as one.
    // If it's a primitive type at root, we just show a type selector.
    return (
      <div className='flex items-center gap-2'>
        <Label className='text-xs'>{dict.schemaBuilder.type}</Label>
        <Select
          value={value.type}
          onValueChange={handleRootTypeChange}
          disabled={disabled}
        >
          <SelectTrigger className='h-7 w-[100px] text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              'string',
              'number',
              'integer',
              'boolean',
              'object',
              'array',
              'null',
            ].map((t) => (
              <SelectItem key={t} value={t} className='text-xs'>
                {
                  dict.schemaBuilder.types[
                    t as keyof typeof dict.schemaBuilder.types
                  ]
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (value.type === 'array' && isRoot) {
    // Handle array type at root level - show type selector and items editor
    return (
      <div className='space-y-3 px-1 py-3'>
        <div className='flex items-center gap-2'>
          <Label className='text-xs'>{dict.schemaBuilder.type}</Label>
          <Select
            value={value.type}
            onValueChange={handleRootTypeChange}
            disabled={disabled}
          >
            <SelectTrigger className='h-7 w-[100px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'string',
                'number',
                'integer',
                'boolean',
                'object',
                'array',
                'null',
              ].map((t) => (
                <SelectItem key={t} value={t} className='text-xs'>
                  {
                    dict.schemaBuilder.types[
                      t as keyof typeof dict.schemaBuilder.types
                    ]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <div className='my-1 ml-0.5'>
            <Label className='mb-2 block text-xs text-muted-foreground'>
              Items schema:
            </Label>
            <JSONSchemaEditor
              value={value.items || { type: 'string' }}
              onChange={(newItems) => onChange({ ...value, items: newItems })}
              disabled={disabled}
              isRoot={false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (value.type === 'object') {
    return (
      <div className='space-y-3 px-1 py-3'>
        {/* Always show type selector for objects, both root and non-root */}
        <div className='flex items-center gap-2'>
          <Label className='text-xs'>{dict.schemaBuilder.type}</Label>
          <Select
            value={value.type}
            onValueChange={handleRootTypeChange}
            disabled={disabled}
          >
            <SelectTrigger className='h-7 w-[100px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'string',
                'number',
                'integer',
                'boolean',
                'object',
                'array',
                'null',
              ].map((t) => (
                <SelectItem key={t} value={t} className='text-xs'>
                  {
                    dict.schemaBuilder.types[
                      t as keyof typeof dict.schemaBuilder.types
                    ]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          {Object.entries(value.properties || {}).map(([name, schema]) => (
            <PropertyEditor
              key={name}
              name={name}
              schema={schema}
              isRequired={(value.required || []).includes(name)}
              onChange={(newName, newSchema, req) =>
                handlePropertyChange(name, newName, newSchema, req)
              }
              onDelete={() => handleDeleteProperty(name)}
              disabled={disabled}
            />
          ))}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={handleAddProperty}
          disabled={disabled}
          className='h-7 w-full border-dashed text-xs'
        >
          <TbPlus className='mr-2 size-3.5' />
          {dict.schemaBuilder.addProperty}
        </Button>
      </div>
    );
  }

  // Fallback for other types when not root (should be handled by parent PropertyEditor usually)
  return (
    <div className='flex items-center gap-2'>
      <Label className='text-xs'>{dict.schemaBuilder.type}</Label>
      <Select
        value={value.type}
        onValueChange={handleRootTypeChange}
        disabled={disabled}
      >
        <SelectTrigger className='h-7 w-[100px] text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[
            'string',
            'number',
            'integer',
            'boolean',
            'object',
            'array',
            'null',
          ].map((t) => (
            <SelectItem key={t} value={t} className='text-xs'>
              {
                dict.schemaBuilder.types[
                  t as keyof typeof dict.schemaBuilder.types
                ]
              }
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
