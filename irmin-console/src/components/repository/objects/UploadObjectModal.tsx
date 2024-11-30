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
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current ref (e.g., branch)
 */
export default function UploadObjectModal({
  currentRepository,
  currentRef,
}: {
  currentRepository?: string;
  currentRef?: string;
}) {
  const { dict } = useLocale();
  const { irminAlert, irminModal } = usePopup();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues>({
    defaultValues: {
      repository: currentRepository ?? '',
      ref: currentRef ?? '',
      name: '',
      files: null,
      path: '',
    },
  });

  // Handle upload object to the repository
  const handleUpload = useCallback(
    async (data: UploadFormValues) => {
      try {
        setLoading(true);
        setError('');

        if (!data.files) {
          setError(dict.repository.objects.upload.noFilesSelected);
          return;
        }

        // TODO: Upload the object

        // Close the modal and show success message
        irminModal.close();
        irminAlert('success', 'Object uploaded successfully');
      } catch (error) {
        console.error('Failed to upload new object:', error);
        setError((error as Error)?.message ?? 'Could not upload object');
      } finally {
        setLoading(false);
      }
    },
    [irminAlert, irminModal, dict]
  );

  return (
    <form onSubmit={handleSubmit(handleUpload)} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.objects.upload.targetRepository}</Label>
        <Controller
          name='repository'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
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
        <Label>{dict.repository.objects.upload.targetBranch}</Label>
        <Controller
          name='ref'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
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
        <Label>{dict.repository.objects.upload.objectName}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
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
        <Label>{dict.repository.objects.upload.filesToUpload}</Label>
        <Controller
          name='files'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='file'
                multiple
                disabled={loading}
                onChange={(e) => {
                  // Ensure that `field.onChange` is called with the selected files
                  field.onChange(e.target.files);
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
        <Label>{dict.repository.objects.upload.pathInRepository}</Label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <Input type='text' placeholder='/example/path' {...field} />
          )}
        />
      </div>
      {error && <div className='py-2 text-destructive'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='default'
          size='sm'
          className='w-full'
          disabled={loading}
          type='submit'
        >
          {loading ? dict.misc.loading : dict.repository.objects.uploadObject}
        </Button>
      </div>
    </form>
  );
}
