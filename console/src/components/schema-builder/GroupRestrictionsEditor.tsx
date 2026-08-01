'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

interface GroupRestrictionsEditorProps {
  value: ObjectSchema;
  onChange: (schema: ObjectSchema) => void;
  disabled?: boolean;
}

export default function GroupRestrictionsEditor({
  value,
  onChange,
  disabled,
}: GroupRestrictionsEditorProps) {
  const { dict } = useLocale();
  const restrictions = value.restrictions || {};

  const updateRestriction = (
    key: keyof NonNullable<ObjectSchema['restrictions']>,
    val: NonNullable<ObjectSchema['restrictions']>[keyof NonNullable<
      ObjectSchema['restrictions']
    >]
  ) => {
    onChange({
      ...value,
      restrictions: {
        ...restrictions,
        [key]: val,
      },
    });
  };

  return (
    <div className='flex flex-col gap-4 rounded-md border p-4'>
      <h3 className='font-medium'>{dict.schemaBuilder.restrictions}</h3>

      <div
        className={`
          grid grid-cols-1 gap-4
          md:grid-cols-2
        `}
      >
        <div className='space-y-4'>
          <h4 className='text-sm font-medium text-muted-foreground'>
            {dict.schemaBuilder.types.object}
          </h4>
          {[
            'no_structured',
            'no_binary',
            'no_groups',
            'only_structured',
            'only_binary',
            'only_groups',
          ].map((key) => {
            const camelKey = key.replace(/_([a-z])/g, (g) =>
              g[1].toUpperCase()
            ) as keyof typeof dict.schemaBuilder;
            return (
              <div key={key} className='flex items-center space-x-2'>
                <Checkbox
                  id={`restriction-${key}`}
                  checked={!!restrictions[key as keyof typeof restrictions]}
                  onCheckedChange={(checked) =>
                    updateRestriction(
                      key as keyof typeof restrictions,
                      checked === true
                    )
                  }
                  disabled={disabled}
                />
                <Label htmlFor={`restriction-${key}`}>
                  {dict.schemaBuilder[camelKey] as string}
                </Label>
              </div>
            );
          })}
        </div>

        <div className='space-y-4'>
          <h4 className='text-sm font-medium text-muted-foreground'>
            {dict.schemaBuilder.constraints}
          </h4>

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label htmlFor='min_size'>{dict.schemaBuilder.minSize}</Label>
              <Input
                id='min_size'
                type='number'
                value={restrictions.min_size ?? ''}
                onChange={(e) =>
                  updateRestriction(
                    'min_size',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                disabled={disabled}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='max_size'>{dict.schemaBuilder.maxSize}</Label>
              <Input
                id='max_size'
                type='number'
                value={restrictions.max_size ?? ''}
                onChange={(e) =>
                  updateRestriction(
                    'max_size',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label htmlFor='min_count'>{dict.schemaBuilder.minCount}</Label>
              <Input
                id='min_count'
                type='number'
                value={restrictions.min_count ?? ''}
                onChange={(e) =>
                  updateRestriction(
                    'min_count',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                disabled={disabled}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='max_count'>{dict.schemaBuilder.maxCount}</Label>
              <Input
                id='max_count'
                type='number'
                value={restrictions.max_count ?? ''}
                onChange={(e) =>
                  updateRestriction(
                    'max_count',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className='space-y-1'>
            <Label htmlFor='name_pattern'>
              {dict.schemaBuilder.namePattern}
            </Label>
            <Input
              id='name_pattern'
              value={restrictions.name_pattern || ''}
              onChange={(e) =>
                updateRestriction(
                  'name_pattern',
                  e.target.value === '' ? undefined : e.target.value
                )
              }
              disabled={disabled}
              placeholder='^[a-z]+$'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
