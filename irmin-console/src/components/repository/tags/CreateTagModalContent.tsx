'use client';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  tagName: string;
  ref: string;
}

/**
 * Modal content to create a new tag.
 *
 * @param props - The props
 * @param props.currentRef - The current ref to create the tag for
 * @param props.createTag - Callback to create a new tag
 */
export default function CreateTagModalContent({
  currentRef,
  createTag,
}: {
  currentRef: string;
  createTag: (tagName: string, ref: string) => Promise<void>;
}) {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      tagName: '',
      ref: currentRef,
    },
  });

  const onSubmit = async (data: FormValues) => {
    await createTag(data.tagName, data.ref);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-8'
    >
      <div className='flex flex-col gap-2'>
        <label htmlFor='tagName' className='text-xs'>
          {dict.repository.tags.newTagName}
        </label>
        <Controller
          name='tagName'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                id='tagName'
                type='text'
                variant='outline'
                colorScheme='gray'
                size='sm'
                {...field}
              />
              {errors.tagName && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.tagName.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <label htmlFor='ref' className='text-xs'>
          {dict.repository.tags.fromCommit}
        </label>
        <Controller
          name='ref'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                id='ref'
                type='text'
                variant='outline'
                colorScheme='gray'
                size='sm'
                disabled={true}
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
      <Button
        variant='solid'
        colorScheme='primary'
        size='sm'
        className='w-full'
        type='submit'
      >
        {dict.repository.tags.createTag}
      </Button>
    </form>
  );
}
