'use client';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/core/Repository';

/**
 * Modal content to create a new repository.
 *
 * @param props - The props
 * @param props.closeModal - Callback to close the modal
 */
export default function CreateRepositoryModalContent({
  closeModal,
}: {
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    repositories: { createRepository },
  } = useWorkspace();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: { name: string; description: string }) => {
    try {
      const { name, description } = data;
      const res = await createRepository({
        name: name.trim(),
        description: description.trim(),
        documentation: '',
      } as Repository);
      irminAlert('success', res.message ?? 'Repository created successfully');
      closeModal();
      reset(); // Reset the form values
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          'An error occurred while creating the repository'
      );
    }
  };

  return (
    <form
      id='create-repository-modal-content'
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 px-4 py-8'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.settings.name}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} />
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
        <Label>{dict.repository.settings.description}</Label>
        <Controller
          name='description'
          control={control}
          rules={{ required: dict.misc.fieldRequired }}
          render={({ field }) => (
            <>
              <Input
                {...field}
                longtext={{
                  rows: 3,
                }}
              />
              {errors.description && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.description.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <Button className='h-11 w-full' type='submit' size='sm' variant='default'>
        {dict.repository.createNewRepository}
      </Button>
    </form>
  );
}
