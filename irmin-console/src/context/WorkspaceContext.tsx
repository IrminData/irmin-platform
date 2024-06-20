'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Workspace, WorkspaceAPIResponse } from '@/types/Workspace';

const WorkspaceContext = createContext<{
  workspaces: Workspace[] | null;
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaces: () => void;
}>({
  workspaces: null,
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  fetchWorkspaces: () => {},
});

const fetchWorkspacesData = async (): Promise<WorkspaceAPIResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/workspaces`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch workspaces');
  }

  return response.json();
};

export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );

  // Fetch the workspaces data
  const fetchWorkspaces = async () => {
    try {
      const data = await fetchWorkspacesData();
      if (Array.isArray(data.data)) {
        setWorkspaces(data.data);
      } else {
        setWorkspaces(null);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces(null);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
