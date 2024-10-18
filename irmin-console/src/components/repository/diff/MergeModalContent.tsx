'use client';

import { useCallback, useMemo, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modal content to merge refs.
 *
 * @param props - The props
 * @param props.baseRef - The ref to merge into (branch, tag, commit)
 * @param props.compareRef - The ref to merge (branch, tag, commit)
 * @param props.mergeRefs - Callback to merge the refs
 * @param props.closeModal - Callback to close the modal
 */
export default function MergeModalContent({
  baseRef,
  compareRef,
  mergeRefs,
  closeModal,
}: {
  baseRef: string;
  compareRef: string;
  mergeRefs: (
    baseRef: string,
    compareRef: string,
    description: string,
    mergeStrategy: string
  ) => Promise<boolean>;
  closeModal: () => void;
}) {
  const { dict } = useLocale();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      description: '',
      mergeStrategy: 'default',
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const mergeStrategies = useMemo(
    () => [
      { value: 'default', label: dict.repository.compare.defaultStrategy },
      {
        value: 'source-wins',
        label: dict.repository.compare.sourceWinsStrategy,
      },
      { value: 'dest-wins', label: dict.repository.compare.destWinsStrategy },
    ],
    [dict]
  );

  /**
   * Handle the merge refs form submission, merge one ref in to another.
   */
  const onSubmit = useCallback(
    async (data: { description: string; mergeStrategy: string }) => {
      try {
        setLoading(true);
        const successful = await mergeRefs(
          baseRef,
          compareRef,
          data.description,
          data.mergeStrategy
        );
        if (successful) {
          closeModal();
        }
      } catch (error) {
        console.error('Failed to merge refs', error);
      } finally {
        setLoading(false);
      }
    },
    [baseRef, compareRef, closeModal, mergeRefs]
  );

  return (
    <form
      className='flex flex-col gap-4 pb-6'
      id='merge-modal-content'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.compare.mergeCommitDescription}</Label>
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder={dict.repository.compare.mergeCommitDescription}
            />
          )}
        />
        {errors.description && (
          <p className='mt-1 text-xs text-red-600'>
            {errors.description.message}
          </p>
        )}
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.compare.mergeStrategy}</Label>
        <div className='w-full'>
          <Controller
            name='mergeStrategy'
            control={control}
            render={({ field }) => (
              <ReactSelect
                {...field}
                options={mergeStrategies}
                className='react-select-container w-full'
                classNamePrefix='react-select'
                value={mergeStrategies.find(
                  (strategy) => strategy.value === field.value
                )}
                onChange={(newValue) => field.onChange(newValue?.value)}
              />
            )}
          />
        </div>
        <p className='mt-2 px-1 text-xs opacity-70'>
          {dict.repository.compare.mergeExplanation}
        </p>
      </div>
      <Button
        className='mt-4 h-11 w-full'
        type='submit'
        size='sm'
        variant='default'
        disabled={loading}
      >
        {dict.repository.compare.merge}
      </Button>
    </form>
  );
}
