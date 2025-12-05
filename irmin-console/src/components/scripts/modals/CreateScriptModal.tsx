'use client';

import { useCallback, useState } from 'react';

import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';

import type { Tag } from '@/types/core/Tag';

interface CreateScriptModalProps {
  workspaceSlug: string;
  onSubmit: (name: string, description?: string, tags?: Tag[]) => void;
  onCancel: () => void;
  defaultName?: string;
}

interface FormData {
  name: string;
  description?: string;
}

/**
 * Modal for creating a new script with metadata
 */
export default function CreateScriptModal({
  workspaceSlug,
  onSubmit,
  onCancel,
  defaultName,
}: CreateScriptModalProps) {
  const { dict } = useLocale();
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: defaultName || '',
      description: '',
    },
  });

  const handleFormSubmit = useCallback(
    (data: FormData) => {
      onSubmit(data.name, data.description, selectedTags);
    },
    [onSubmit, selectedTags]
  );

  const handleTagsChange = useCallback(async (tags: Tag[]) => {
    setSelectedTags(tags);
    return tags;
  }, []);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-4'>
      <div>
        <Label htmlFor='script-name'>{dict.common.name}</Label>
        <Input
          id='script-name'
          type='text'
          placeholder={dict.scripts.scriptName}
          {...register('name', { required: true })}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className='mt-1 text-sm text-red-500'>
            {dict.common.fieldRequired}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor='script-description'>
          {dict.common.description} ({dict.common.optional || 'Optional'})
        </Label>
        <Textarea
          id='script-description'
          placeholder={dict.scripts.scriptDescription}
          {...register('description')}
          rows={3}
        />
      </div>

      <div>
        <Label>{dict.common.tags || 'Tags'}</Label>
        <WorkspaceTagSelector
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          workspaceSlug={workspaceSlug}
          loading={false}
          disabled={false}
        />
      </div>

      <div className='flex justify-end gap-2'>
        <Button type='button' variant='secondary' onClick={onCancel}>
          {dict.common.cancel}
        </Button>
        <Button type='submit' variant='default'>
          {dict.scripts.createScript}
        </Button>
      </div>
    </form>
  );
}
