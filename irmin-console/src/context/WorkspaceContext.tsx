'use client';

import { createContext, useContext, useEffect } from 'react';

import { useConsoleSearchContext } from '@/context/ConsoleSearchContext';

import { useWorkspaces } from '@/hooks/useWorkspaces';

import { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';

/**
 * Workspace context properties
 */
interface WorkspaceContextProps extends ReturnType<typeof useWorkspaces> {
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
  searchItems,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
  searchItems: ConsoleSearchItem[];
}) => {
  const workspaces = useWorkspaces(workspaceSlug);
  const { setSearchItems } = useConsoleSearchContext();

  // Update the search items in the context when the workspace changes
  useEffect(() => {
    setSearchItems(searchItems);
  }, [workspaceSlug, searchItems, setSearchItems]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceSlug,
        ...workspaces,
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
