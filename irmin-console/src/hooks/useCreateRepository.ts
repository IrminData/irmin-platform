import { useCallback, useRef, useState } from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export const useCreateRepository = ({
  reset,
  closeModal,
}: {
  reset: () => void;
  closeModal: () => void;
}) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const [processing, setProcessing] = useState(false);

  const creatingRepository = useRef(false);

  /**
   * Create the repository with the provided data using the Irmin API
   */
  const handleCreate = useCallback(
    async (repository: {
      name: string;
      description?: string;
      documentation?: string;
      default_branch?: string;
      garbageDefaultRetentionDays?: number;
      garbageDefaultBranchRetentionDays?: number;
    }) => {
      // Prevent multiple requests
      if (creatingRepository.current) return;
      try {
        creatingRepository.current = true;
        setProcessing(true);
        // Create the repository
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.repositoryService.createRepository({
          workspace: workspaceSlug,
          name: repository.name,
          description: repository.description ?? '',
          documentation: repository.documentation ?? '',
          default_branch: repository.default_branch ?? 'main',
          isImmutable: false,
          garbageDefaultRetentionDays: repository.garbageDefaultRetentionDays,
          garbageDefaultBranchRetentionDays:
            repository.garbageDefaultBranchRetentionDays,
        });
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
    [irminAlert, workspaceSlug, reset, closeModal, getToken, locale]
  );

  return {
    processing,
    handleCreate,
  };
};
