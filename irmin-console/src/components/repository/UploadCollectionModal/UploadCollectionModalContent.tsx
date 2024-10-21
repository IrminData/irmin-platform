'use client';

import { useCallback, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import IrminCore from '@/lib/core';
import { Dictionary } from '@/lib/dict';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { usePopup } from '@/context/PopupContext';

interface UploadFormValues {
  repository: string;
  ref: string;
  name: string;
  files: FileList | null;
  path: string;
}

/**
 * UI for the upload collection modal.
 *
 * @param props - The component props
 * @param props.irminCore - The Irmin core instance
 * @param props.dict - The dictionary for the current locale
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current ref (e.g., branch)
 */
export default function UploadCollectionModalContent({
  irminCore,
  dict,
  currentRepository,
  currentRef,
}: {
  irminCore: IrminCore;
  dict: Dictionary;
  currentRepository?: string;
  currentRef?: string;
}) {
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

  // Handle upload collection to the repository
  const handleUpload = useCallback(
    async (data: UploadFormValues) => {
      try {
        setLoading(true);
        setError('');

        if (!data.files) {
          setError(dict.repository.collections.upload.noFilesSelected);
          return;
        }

        // Upload the collection
        const res = await irminCore.collectionService.uploadCollection(
          data.repository,
          data.ref,
          data.name,
          data.files,
          data.path
        );

        // Close the modal and show success message
        irminModal.close();
        irminAlert(
          'success',
          res.message ?? 'Collection uploaded successfully'
        );
      } catch (error) {
        console.error('Failed to upload new collection:', error);
        setError((error as Error)?.message ?? 'Could not upload collection');
      } finally {
        setLoading(false);
      }
    },
    [irminCore, irminAlert, irminModal, dict]
  );

  return (
    <form onSubmit={handleSubmit(handleUpload)} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.collections.upload.targetRepository}</Label>
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
        <Label>{dict.repository.collections.upload.targetBranch}</Label>
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
        <Label>{dict.repository.collections.upload.collectionName}</Label>
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
        <Label>{dict.repository.collections.upload.filesToUpload}</Label>
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
        <Label>{dict.repository.collections.upload.pathInRepository}</Label>
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
          {loading
            ? dict.misc.loading
            : dict.repository.collections.uploadCollection}
        </Button>
      </div>
    </form>
  );
}
