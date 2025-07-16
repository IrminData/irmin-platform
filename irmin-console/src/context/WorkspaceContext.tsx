'use client';

import { createContext, useContext } from 'react';

import { useWorkspace } from '@/hooks/api/useWorkspace';

/**
 * Workspace context properties
 */
interface WorkspaceContextProps extends ReturnType<typeof useWorkspace> {
  workspaceSlug: string;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(
  undefined
);

/**
 * Workspace context for state management and interactions with workspaces of the workspace
 */
export const WorkspaceProvider = ({
  children,
  workspaceSlug,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
}) => {
  const workspace = useWorkspace(workspaceSlug);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceSlug,
        ...workspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook to use the workspace context
 */
export const useWorkspaceContext = (): WorkspaceContextProps => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      'useWorkspaceContext must be used within a WorkspaceProvider'
    );
  }
  return context;
};
