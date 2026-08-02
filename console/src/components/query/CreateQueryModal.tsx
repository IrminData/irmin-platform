'use client';

import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';

import type { Tag } from '@/types/core/Tag';

interface FormValues {
  queryName: string;
  queryDescription: string;
}

/**
 * Modal content to create a new saved query without a content field.
 *
 * @param props - The props
 * @param props.workspaceSlug - The workspace slug
 * @param props.createQuery - Callback to create a new saved query
 */
export default function CreateSavedQueryModal({
  workspaceSlug,
  createQuery,
}: {
  workspaceSlug: string;
  createQuery: (
    queryName: string,
    queryDescription: string,
    tags?: Tag[]
  ) => Promise<void>;
}) {
  const { dict } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      queryName: '',
      queryDescription: '',
    },
  });

  const handleTagsChange = async (tags: Tag[]) => {
    setSelectedTags(tags);
    return tags;
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await createQuery(data.queryName, data.queryDescription, selectedTags);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`
        flex flex-col gap-4 pb-8 duration-200
        ${isSubmitting ? 'pointer-events-none blur-xs' : ''}
      `}
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.common.name}</Label>
        <Controller
          name='queryName'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} disabled={isSubmitting} />
              {errors.queryName && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.queryName.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label>{dict.common.description}</Label>
        <Controller
          name='queryDescription'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                longtext={{
                  rows: 3,
                }}
                {...field}
                disabled={isSubmitting}
              />
              {errors.queryDescription && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.queryDescription.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <WorkspaceTagSelector
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          loading={false}
          disabled={isSubmitting}
          workspaceSlug={workspaceSlug}
        />
      </div>

      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={isSubmitting}
      >
        {isSubmitting ? dict.common.loading : dict.query.createQuery}
      </Button>
    </form>
  );
}
