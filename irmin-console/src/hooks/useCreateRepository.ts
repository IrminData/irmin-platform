import { useCallback, useRef, useState } from 'react';

import { createRepository } from '@/lib/actions/repositories';

import { usePopup } from '@/context/PopupContext';

import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

export const useCreateRepository = ({
  reset,
  closeModal,
}: {
  reset: () => void;
  closeModal: () => void;
}) => {
  const { irminAlert } = usePopup();
  const [processing, setProcessing] = useState(false);

  const creatingRepository = useRef(false);

  /**
   * Create the repository with the provided data using the Irmin API
   */
  const handleCreate = useCallback(
    async (repository: ItemUpdateProps) => {
      // Prevent multiple requests
      if (creatingRepository.current) return;
      try {
        creatingRepository.current = true;
        setProcessing(true);
        // Create the repository
        const res = await createRepository(repository);
        // Show the result to the user
        irminAlert(
          'success',
          res?.message ?? 'Repository created successfully'
        );
        // Close the modal
        closeModal();
        // Reset the form values
        reset();
      } catch (error) {
        console.error('Failed to create repository', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create the repository'
        );
      } finally {
        setProcessing(false);
        creatingRepository.current = false;
      }
    },
    [irminAlert, reset, closeModal]
  );

  return {
    processing,
    handleCreate,
  };
};
