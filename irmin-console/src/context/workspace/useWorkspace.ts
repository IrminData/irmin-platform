'use client';

import { useContext } from 'react';

import WorkspaceContext from './WorkspaceContext';

/**
 * Hook to use the workspace context
 */
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
