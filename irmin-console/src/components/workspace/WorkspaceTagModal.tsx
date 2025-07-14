'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

import type { Tag } from '@/types/core/Tag';

const COLOR_PALETTE = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#6B7280',
];

interface WorkspaceTagModalProps {
  initialTag?: Partial<Tag>;
  onSubmit: (tag: Tag) => void;
  onCancel?: () => void;
}

export function WorkspaceTagModal({
  initialTag,
  onSubmit,
  onCancel,
}: WorkspaceTagModalProps) {
  const { dict } = useLocale();

  const [name, setName] = useState(initialTag?.name || '');
  const [color, setColor] = useState(initialTag?.color || COLOR_PALETTE[0]);
  const [description, setDescription] = useState(initialTag?.description || '');
  const [customColor, setCustomColor] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name.trim()) return;

      const newTag: Tag = {
        id: initialTag?.id || `tag-${Date.now()}`,
        name: name.trim(),
        color: customColor || color,
        description: description.trim(),
      };

      onSubmit(newTag);

      // Reset form
      setName('');
      setColor(COLOR_PALETTE[0]);
      setDescription('');
      setCustomColor('');
    },
    [name, color, customColor, description, initialTag, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='tag-name'>{dict.common.name}</Label>
        <Input
          id='tag-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label>{dict.common.color}</Label>

        {/* Color Palette */}
        <div className='grid grid-cols-8 gap-2'>
          {COLOR_PALETTE.map((paletteColor) => (
            <button
              key={paletteColor}
              type='button'
              className={cn(
                `
                  h-12 w-full rounded-md border-2 transition-all
                  hover:scale-110
                `,
                (customColor || color) === paletteColor
                  ? 'border-foreground ring-2 ring-ring ring-offset-2'
                  : `
                    border-border
                    hover:border-foreground/50
                  `
              )}
              style={{ backgroundColor: paletteColor }}
              onClick={() => {
                setColor(paletteColor);
                setCustomColor('');
              }}
            />
          ))}
        </div>

        {/* Custom Color Input */}
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={customColor || color}
            onChange={(e) => setCustomColor(e.target.value)}
            className='size-12 cursor-pointer border-none p-1'
          />
          <Input
            value={customColor || color}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder='#RRGGBB'
            className='h-9 flex-1 font-mono text-sm'
            pattern='^#([A-Fa-f0-9]{6})$'
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='tag-description'>{dict.common.description}</Label>
        <Input
          id='tag-description'
          longtext={{
            rows: 2,
          }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className='flex justify-end gap-2 pt-2'>
        {onCancel && (
          <Button type='button' variant='secondary' onClick={onCancel}>
            {dict.common.cancel}
          </Button>
        )}
        <Button type='submit' disabled={!name.trim()}>
          {initialTag?.id ? dict.common.update : dict.common.create}
        </Button>
      </div>
    </form>
  );
}
