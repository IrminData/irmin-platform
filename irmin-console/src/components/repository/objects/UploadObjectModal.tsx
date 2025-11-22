'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Tag } from '@/types/core/Tag';

interface UploadFormValues {
  repository: string;
  ref: string;
  name: string;
  files: FileList | null;
  path: string;
  tags: string[];
}

/**
 * UI for the upload object modal.
 *
 * @param props
 * @param props.uploadObject - The function to upload the object
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current branch/ref
 * @param props.prefilledName - The name to prefill in the name field
 */
export default function UploadObjectModal({
  uploadObject,
  currentRepository,
  currentRef,
  prefilledName,
}: {
  uploadObject: (
    path: string,
    ref: string,
    files: FileList,
    tags?: string[]
  ) => Promise<void>;
  currentRepository: string;
  currentRef: string;
  prefilledName?: string;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<UploadFormValues>({
    defaultValues: {
      repository: currentRepository,
      ref: currentRef,
      files: null,
      name: prefilledName ?? 'example.txt',
      path: `/${prefilledName ?? 'example.txt'}`,
      tags: [],
    },
  });

  // Keep track of current field values
  const nameValue = watch('name');
  const pathValue = watch('path');

  // Sync name ↔ path, based on which was edited last
  const lastChanged = useRef<'name' | 'path' | null>(null);
  useEffect(() => {
    if (lastChanged.current === 'name') {
      // user changed name, so update path
      setValue('path', `/${nameValue}`);
    } else if (lastChanged.current === 'path') {
      // user changed path, so update name
      const newName = pathValue.split('/').pop() ?? '';
      setValue('name', newName);
    }
    // reset so we only do this once per edit
    lastChanged.current = null;
  }, [nameValue, pathValue, setValue]);

  const handleTagsChange = useCallback(
    async (tags: Tag[]) => {
      setSelectedTags(tags);
      setValue(
        'tags',
        tags.map((t) => t.id)
      );
      return tags;
    },
    [setValue]
  );

  // Handle upload object to the repository
  const handleUpload = useCallback(
    async (data: UploadFormValues) => {
      try {
        setLoading(true);
        setError('');

        if (!data.files) {
          setError(dict.repository.objects.noFilesSelected);
          return;
        }

        // Upload the object
        await uploadObject(data.path, data.ref, data.files, data.tags);

        // Close the modal
        irminModal.close();
      } catch (error) {
        console.error('Failed to upload new object:', error);
        setError((error as Error)?.message ?? 'Could not upload object');
      } finally {
        setLoading(false);
      }
    },
    [uploadObject, irminModal, dict]
  );

  return (
    <form onSubmit={handleSubmit(handleUpload)} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.fileToUpload}</Label>
        <Controller
          name='files'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='file'
                disabled={loading}
                onChange={(e) => {
                  const files = e.target.files;
                  field.onChange(files);
                  if (files && files[0]) {
                    // Auto-set the name field to the selected file's name
                    if (!prefilledName) {
                      setValue('name', files[0].name);
                      setValue('path', `/${files[0].name}`);
                    }
                  }
                }}
              />
              {errors.files && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.files.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                disabled={loading}
                onChange={(e) => {
                  field.onChange(e);
                  lastChanged.current = 'name';
                }}
              />
              {errors.name && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.name.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <>
              <Input
                type='text'
                placeholder='/path/to/example.json'
                disabled={loading}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  lastChanged.current = 'path';
                }}
              />
              {errors.path && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.path.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.targetRepository}</Label>
        <Controller
          name='repository'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                disabled={!!currentRepository || loading}
                {...field}
              />
              {errors.repository && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.repository.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.targetBranch}</Label>
        <Controller
          name='ref'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                disabled={!!currentRef || loading}
                {...field}
              />
              {errors.ref && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.ref.message}
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
          disabled={loading}
        />
      </div>
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          className='w-full'
          loading={loading}
          type='submit'
        >
          {dict.repository.objects.uploadObject}
        </Button>
      </div>
    </form>
  );
}
