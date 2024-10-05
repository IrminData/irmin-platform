'use client';

import { useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';
import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

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
 * Content for the upload collection modal.
 *
 * Provides the UI and logic for the user to upload new collections
 * to the repository.
 *
 * @param props - The component props
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current ref (e.g., branch)
 */
export default function UploadCollectionModalContent({
  currentRepository,
  currentRef,
}: {
  currentRepository?: string;
  currentRef?: string;
}) {
  const { irminAlert, irminModal } = usePopup();
  const { dict, locale } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { repositoryService } = useMemo(() => new IrminCore(locale), [locale]);

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
  const handleUpload = async (data: UploadFormValues) => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      if (!data.files) {
        setError(dict.repository.collections.upload.noFilesSelected);
        return;
      }

      // Upload the collection
      const res = await repositoryService.uploadCollection(
        data.repository,
        data.ref,
        data.name,
        data.files,
        data.path
      );

      // Close the modal and show success message
      irminModal.close();
      irminAlert('success', res.message ?? 'Collection uploaded successfully');
    } catch (error) {
      console.error('Failed to upload new collection:', error);
      setError((error as Error)?.message ?? 'Could not upload collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleUpload)} className='space-y-4'>
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.collections.upload.targetRepository}
        </label>
        <Controller
          name='repository'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                disabled={!!currentRepository}
                size='sm'
                variant='outline'
                colorScheme='gray'
                className={`w-full ${
                  errors.repository ? 'border-red-500' : 'border-gray-300'
                }`}
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
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.collections.upload.targetBranch}
        </label>
        <Controller
          name='ref'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                disabled={!!currentRef}
                size='sm'
                variant='outline'
                colorScheme='gray'
                className={`w-full ${
                  errors.ref ? 'border-red-500' : 'border-gray-300'
                }`}
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
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.collections.upload.collectionName}
        </label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='text'
                {...field}
                size='sm'
                variant='outline'
                colorScheme='gray'
                className={`w-full ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
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
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.collections.upload.filesToUpload}
        </label>
        <Controller
          name='files'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                type='file'
                multiple
                size='sm'
                variant='outline'
                colorScheme='gray'
                className={`w-full ${
                  errors.files ? 'border-red-500' : 'border-gray-300'
                }`}
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
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.collections.upload.pathInRepository}
        </label>
        <Controller
          name='path'
          control={control}
          render={({ field }) => (
            <Input
              type='text'
              {...field}
              size='sm'
              variant='outline'
              colorScheme='gray'
              className='w-full'
              placeholder='/example/path'
            />
          )}
        />
      </div>
      {error && <div className='py-2 text-red-800'>{error}</div>}
      <div className='pb-3'>
        <Button
          variant='solid'
          colorScheme='primary'
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
