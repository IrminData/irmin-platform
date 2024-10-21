import { useCallback, useRef, useState } from 'react';

import { createWorkspace } from '@/lib/actions/workspaces';

export const useCreateWorkspace = ({ reset }: { reset: () => void }) => {
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
        const res = await createWorkspace(name, description);
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
    [reset]
  );

  return {
    handleCreate,
    errorMessage,
    successMessage,
  };
};
