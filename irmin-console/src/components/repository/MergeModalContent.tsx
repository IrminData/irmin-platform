'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';
import { Controller, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

/**
 * Modal content to merge refs.
 *
 * @param props - The props
 * @param props.repository - The repository refs are in
 * @param props.baseRef - The ref to merge into (branch, tag, commit)
 * @param props.compareRef - The ref to merge (branch, tag, commit)
 * @param props.closeModal - Callback to close the modal
 */
export default function MergeModalContent({
  repository,
  baseRef,
  compareRef,
  closeModal,
}: {
  repository: string;
  baseRef: string;
  compareRef: string;
  closeModal: () => void;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();

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
  const mergeInProgress = useRef<boolean>(false);

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
   * Merge the refs using Irmin API.
   *
   * @param description - The commit message
   * @param strategy - The merge strategy (default, source-wins, dest-wins)
   */
  const mergeRefs = useCallback(
    async (description: string, strategy: string) => {
      if (mergeInProgress.current) return;
      try {
        setLoading(true);
        mergeInProgress.current = true;
        const { compareService } = new IrminCore(locale);
        const res = await compareService.mergeRefs(
          repository,
          baseRef,
          compareRef,
          description,
          strategy
        );
        mergeInProgress.current = false;
        irminAlert(
          'success',
          res.message ?? dict.repository.compare.mergedRefsSuccessfully
        );
        closeModal();
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? dict.repository.compare.failedToMergeRefs
        );
      } finally {
        setLoading(false);
      }
    },
    [locale, dict, irminAlert, repository, baseRef, compareRef, closeModal]
  );

  const onSubmit = (data: { description: string; mergeStrategy: string }) => {
    mergeRefs(data.description, data.mergeStrategy);
  };

  return (
    <form
      className='flex flex-col gap-4 p-4 pb-6'
      id='merge-modal-content'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
          {dict.repository.compare.mergeCommitDescription}
        </label>
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              className='h-11 w-full'
              type='text'
              placeholder={dict.repository.compare.mergeCommitDescription}
              {...field}
            />
          )}
        />
        {errors.description && (
          <p className='mt-1 text-xs text-red-600'>
            {errors.description.message}
          </p>
        )}
      </div>
      <div>
        <label className='mb-1 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
          {dict.repository.compare.mergeStrategy}
        </label>
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
        colorScheme='primary'
        variant='solid'
        disabled={loading}
      >
        {dict.repository.compare.merge}
      </Button>
    </form>
  );
}
