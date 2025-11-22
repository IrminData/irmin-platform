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
  onSubmit: (_tag: Tag) => Promise<void> | void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name.trim() || isSubmitting) return;

      try {
        setIsSubmitting(true);
        const newTag: Tag = {
          id: initialTag?.id || `tag-${Date.now()}`,
          name: name.trim(),
          color: customColor || color,
          description: description.trim(),
        };

        await onSubmit(newTag);

        // Reset form only if not editing (though usually modal closes)
        if (!initialTag?.id) {
          setName('');
          setColor(COLOR_PALETTE[0]);
          setDescription('');
          setCustomColor('');
        }
      } catch (error) {
        console.error('Error submitting tag:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, color, customColor, description, initialTag, onSubmit, isSubmitting]
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
          disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                  `,
                isSubmitting &&
                  `
                    cursor-not-allowed opacity-50
                    hover:scale-100
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
            className={`
              size-12 cursor-pointer border-none p-1
              disabled:cursor-not-allowed disabled:opacity-50
            `}
            disabled={isSubmitting}
          />
          <Input
            value={customColor || color}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder='#RRGGBB'
            className='h-9 flex-1 font-mono text-sm'
            pattern='^#([A-Fa-f0-9]{6})$'
            disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
      </div>

      <div className='flex justify-end gap-2 pt-2'>
        {onCancel && (
          <Button
            type='button'
            variant='secondary'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {dict.common.cancel}
          </Button>
        )}
        <Button type='submit' disabled={!name.trim()} loading={isSubmitting}>
          {initialTag?.id ? dict.common.update : dict.common.create}
        </Button>
      </div>
    </form>
  );
}
