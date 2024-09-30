'use client';

import { useState } from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

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

  const [nameField, setNameField] = useState('');
  const [descriptionField, setDescriptionField] = useState('');

  const {
    repositories: { createRepository },
  } = useWorkspace();

  const handleCreateRepository = async () => {
    try {
      const name = nameField.trim();
      const description = descriptionField.trim();
      await createRepository({
        name: name,
        description: description,
        documentation: '',
      } as Repository);
      irminAlert('success', dict.repository.repositoryCreated);
      closeModal();
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  };

  return (
    <div
      className='flex flex-col gap-4 p-4 pb-6'
      id='create-repository-modal-content'
    >
      <div>
        <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
          {dict.repository.settings.name}
        </label>
        <Input
          size='sm'
          variant='outline'
          colorScheme='gray'
          required
          className='h-11 w-full'
          type='text'
          name='name'
          defaultValue={nameField}
          onChange={(e) => setNameField(e.target.value)}
        />
      </div>
      <div>
        <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
          {dict.repository.settings.description}
        </label>
        <Input
          size='sm'
          variant='outline'
          colorScheme='gray'
          required
          className='w-full'
          type='text'
          name='name'
          defaultValue={descriptionField}
          onChange={(e) => setDescriptionField(e.target.value)}
          longtext={{
            rows: 3,
          }}
        />
      </div>
      <Button
        className='h-11 w-full'
        type='submit'
        size='sm'
        colorScheme='primary'
        variant='solid'
        onClick={handleCreateRepository}
      >
        {dict.repository.createNewRepository}
      </Button>
    </div>
  );
}
