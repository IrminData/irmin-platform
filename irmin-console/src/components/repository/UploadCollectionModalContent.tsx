'use client';

import { useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';
import { useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

interface UploadFormValues {
  repository: string;
  ref: string;
  name: string;
  files: FileList;
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
 * @param props.currentRef - The current ref (eg. branch)
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
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues>();

  // Handle upload collection to the repository
  const handleUpload = async (data: UploadFormValues) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      // Upload the collection
      await repositoryService.uploadCollection(
        data.repository,
        data.ref,
        data.name,
        data.files,
        data.path
      );
      // Close the modal
      irminModal.close();
      // Show success message
      irminAlert('success', dict.repository.upload.success);
    } catch (error) {
      console.error('Failed to upload new collection:', error);
      setError((error as Error)?.message ?? dict.repository.upload.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleUpload)}>
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.upload.targetRepository}
        </label>
        <input
          type='text'
          {...register('repository')}
          value={currentRepository ?? ''}
          disabled={!!currentRepository}
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
        />
        {errors.repository && (
          <p className='text-red-800'>{errors.repository.message}</p>
        )}
      </div>
      <div className='pb-3'>
        <label className='text-xs'>{dict.repository.upload.targetBranch}</label>
        <input
          type='text'
          {...register('ref')}
          value={currentRef ?? ''}
          disabled={!!currentRef}
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
        />
        {errors.ref && <p className='text-red-800'>{errors.ref.message}</p>}
      </div>
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.upload.collectionName}
        </label>
        <input
          type='text'
          {...register('name', { required: dict.misc.fieldRequired })}
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
        />
        {errors.name && <p className='text-red-800'>{errors.name.message}</p>}
      </div>
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.upload.filesToUpload}
        </label>
        <input
          disabled={loading}
          type='file'
          multiple
          {...register('files', { required: dict.misc.fieldRequired })}
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
        />
        {errors.files && <p className='text-red-800'>{errors.files.message}</p>}
      </div>
      <div className='pb-3'>
        <label className='text-xs'>
          {dict.repository.upload.pathInRepository}
        </label>
        <input
          placeholder='/example/path'
          type='text'
          {...register('path')}
          className='w-full rounded border bg-gray-100 p-2 text-sm text-irmin_black placeholder:text-gray-300 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500'
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
            : dict.repository.upload.uploadNewCollection}
        </Button>
      </div>
    </form>
  );
}
