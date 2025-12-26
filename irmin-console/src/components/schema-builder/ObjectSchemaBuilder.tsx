'use client';

import { useState } from 'react';

import { TbCode, TbForms } from 'react-icons/tb';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useLocale } from '@/context/LocaleContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

import GroupRestrictionsEditor from './GroupRestrictionsEditor';
import JSONSchemaEditor from './JSONSchemaEditor';
import RawJSONEditor from './RawJSONEditor';

interface ObjectSchemaBuilderProps {
  value: ObjectSchema;
  onChange: (schema: ObjectSchema) => void;
  disabled?: boolean;
  allowedTypes?: ObjectSchema['type'][];
}

export default function ObjectSchemaBuilder({
  value,
  onChange,
  disabled,
  allowedTypes = ['group', 'structured', 'binary'],
}: ObjectSchemaBuilderProps) {
  const { dict } = useLocale();
  const [mode, setMode] = useState<'builder' | 'json'>('builder');

  const updateSchema = (updates: Partial<ObjectSchema>) => {
    onChange({ ...value, ...updates });
  };

  const handleTypeChange = (newType: ObjectSchema['type']) => {
    const updates: Partial<ObjectSchema> = { type: newType };

    // Set default schema for structured type if missing
    if (newType === 'structured' && !value.schema) {
      updates.schema = {
        type: 'object',
        properties: {},
        required: [],
      };
    }

    // Set default content type
    if (newType === 'structured') updates.content_type = 'application/json';
    else if (newType === 'group')
      updates.content_type = undefined; // Groups don't typically have content type
    else if (newType === 'binary')
      updates.content_type = 'application/octet-stream';

    updateSchema(updates);
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          {dict.schemaBuilder.builder}
        </span>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as 'builder' | 'json')}
        >
          <TabsList className='h-7 bg-muted/50 p-0.5'>
            <TabsTrigger value='builder' className='h-6 px-3 text-sm'>
              <TbForms className='mr-1 size-3' />
              {dict.schemaBuilder.builder}
            </TabsTrigger>
            <TabsTrigger value='json' className='h-6 px-3 text-sm'>
              <TbCode className='mr-1 size-3' />
              {dict.schemaBuilder.rawJson}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'json' ? (
        <RawJSONEditor value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <div className='flex flex-col gap-4'>
          {/* Metadata Section */}
          <div
            className={`
              grid grid-cols-1 gap-3
              md:grid-cols-2
            `}
          >
            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.type}
              </Label>
              <Select
                value={value.type}
                onValueChange={handleTypeChange}
                disabled={disabled}
              >
                <SelectTrigger className='h-8 w-full text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.map((t) => (
                    <SelectItem key={t} value={t} className='text-sm'>
                      {
                        dict.repository.objects[
                          t as keyof typeof dict.repository.objects
                        ]
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.contentType}
              </Label>
              <Input
                value={value.content_type || ''}
                onChange={(e) => updateSchema({ content_type: e.target.value })}
                disabled={disabled}
                className='h-8 text-sm'
                placeholder={
                  value.type === 'structured'
                    ? 'application/json'
                    : 'application/octet-stream'
                }
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.name}
              </Label>
              <Input
                value={value.name}
                onChange={(e) => updateSchema({ name: e.target.value })}
                disabled={disabled}
                className='h-8 text-sm'
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.path}
              </Label>
              <Input
                value={value.path}
                onChange={(e) => updateSchema({ path: e.target.value })}
                disabled={disabled}
                className='h-8 text-sm'
              />
            </div>

            <div className='col-span-full space-y-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.description}
              </Label>
              <Input
                value={value.description || ''}
                onChange={(e) => updateSchema({ description: e.target.value })}
                disabled={disabled}
                className='h-8 text-sm'
              />
            </div>
          </div>

          {/* Type Specific Editors */}
          {value.type === 'structured' && (
            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-muted-foreground'>
                {dict.schemaBuilder.properties}
              </Label>
              <div className='rounded-md border'>
                <JSONSchemaEditor
                  value={
                    value.schema || {
                      type: 'object',
                      properties: {},
                      required: [],
                    }
                  }
                  onChange={(newSchema) => updateSchema({ schema: newSchema })}
                  disabled={disabled}
                  isRoot={true}
                />
              </div>
            </div>
          )}

          {value.type === 'group' && (
            <GroupRestrictionsEditor
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  );
}
