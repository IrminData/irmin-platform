'use client';

import { useCallback, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

interface UploadFormValues {
  repository: string;
  ref: string;
  name: string;
  files: FileList | null;
  path: string;
}

/**
 * UI for the upload object modal.
 *
 * @param props - The component props
 * @param props.uploadObject - The function to upload the object
 * @param props.currentPath - The current path in the repository
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current branch/ref
 * @param props.prefilledName - The name to prefill in the name field
 */
export default function UploadObjectModal({
  uploadObject,
  currentPath,
  currentRepository,
  currentRef,
  prefilledName,
}: {
  uploadObject: (path: string, ref: string, files: FileList) => Promise<void>;
  currentPath: string;
  currentRepository: string;
  currentRef: string;
  prefilledName?: string;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UploadFormValues>({
    defaultValues: {
      repository: currentRepository,
      ref: currentRef,
      files: null,
      name: prefilledName ?? 'example.txt',
      path: `${currentPath}${prefilledName ?? 'example.txt'}`,
    },
  });

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
        await uploadObject(data.path, data.ref, data.files);

        // Close the modal and show success message
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
        <Label>{dict.repository.objects.targetRepository}</Label>
        <Controller
          name='repository'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' disabled={!!currentRepository} {...field} />
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
              <Input type='text' disabled={!!currentRef} {...field} />
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
        <Label>{dict.repository.objects.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input type='text' {...field} />
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
                      setValue('path', `${currentPath}${files[0].name}`);
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
        <Label>{dict.repository.objects.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <Input type='text' placeholder='/example/path' {...field} />
          )}
        />
      </div>
      {error && <div className='text-destructive py-2'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          className='w-full'
          loading={loading}
          type='submit'
        >
          {loading ? dict.common.loading : dict.repository.objects.uploadObject}
        </Button>
      </div>
    </form>
  );
}
