import { useCallback, useRef, useState } from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

export const useCreateWorkspace = ({ reset }: { reset: () => void }) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const creatingWorkspace = useRef(false);

  /**
   * Create the workspace with the provided data using the Irmin API
   */
  const handleCreate = useCallback(
    async (name: string, description: string) => {
      // Prevent multiple requests
      if (creatingWorkspace.current) return;
      try {
        creatingWorkspace.current = true;
        setErrorMessage(null);
        setSuccessMessage(null);
        // Create the workspace
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.workspaceService.createWorkspace({
          name,
          description,
        });
        // Show the result to the user
        setSuccessMessage(res?.message ?? 'Workspace created successfully');
        // Reset the form values
        reset();
      } catch (error) {
        console.error('Failed to create workspace', error);
        setErrorMessage(
          (error as Error)?.message ?? 'Failed to create the workspace'
        );
      } finally {
        creatingWorkspace.current = false;
      }
    },
    [reset, getToken, locale]
  );

  return {
    handleCreate,
    errorMessage,
    successMessage,
  };
};
