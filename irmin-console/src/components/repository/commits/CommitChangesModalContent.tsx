'use client';

import { useCallback, useRef, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.commit.commitMessage}</Label>
        <Controller
          name='message'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <Input
              {...field}
              placeholder={dict.repository.commit.commitMessagePlaceholder}
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
        variant='default'
        disabled={loading}
      >
        {dict.repository.commit.commitChanges}
      </Button>
    </form>
  );
}
