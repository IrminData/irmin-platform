'use client';

import { useContext } from 'react';

import WorkspaceContext from './WorkspaceContext';

/**
 * Hook to use the workspace context
 */
export const useWorkspace = () => useContext(WorkspaceContext);
