'use client';

import { useCallback, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modal content to commit the uncommited changes.
 *
 * @param props - The props
 * @param props.commitChanges - Callback to commit the changes
 * @param props.closeModal - Callback to close the modal
 */
export default function CommitChangesModalContent({
  commitChanges,
  closeModal,
}: {
  commitChanges: (message: string) => Promise<boolean>;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      message: '',
    },
  });

  const [loading, setLoading] = useState<boolean>(false);
  const commitInProgress = useRef<boolean>(false);

  /**
   * Handle the commit changes form submission.
   */
  const onSubmit = useCallback(
    async (data: { message: string }) => {
      if (commitInProgress.current) return;
      commitInProgress.current = true;
      setLoading(true);
      const successful = await commitChanges(data.message);
      commitInProgress.current = false;
      setLoading(false);
      if (successful) {
        closeModal();
      }
    },
    [commitChanges, closeModal]
  );

  return (
    <form
      className='flex flex-col gap-4 pb-6'
      id='commit-changes-modal-content'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
          {dict.repository.commit.commitMessage}
        </label>
        <Controller
          name='message'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              className='h-11 w-full'
              type='text'
              placeholder={dict.repository.commit.commitMessagePlaceholder}
              {...field}
            />
          )}
        />
        {errors.message && (
          <p className='mt-1 text-xs text-red-600'>{errors.message.message}</p>
        )}
      </div>
      <Button
        className='mt-4 h-11 w-full'
        type='submit'
        size='sm'
        colorScheme='primary'
        variant='solid'
        disabled={loading}
      >
        {dict.repository.commit.commitChanges}
      </Button>
    </form>
  );
}
