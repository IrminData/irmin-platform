'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { IrminRole, Workspace } from '@/types/Workspace';
import WorkspaceService from '@/lib/WorkspaceService';

const WorkspaceContext = createContext<{
  workspaces: Workspace[] | null;
  currentWorkspace: Workspace | null;
  irminRoles: IrminRole[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaces: () => void;
  refetchCurrentWorkspace: () => void;
}>({
  workspaces: null,
  currentWorkspace: null,
  irminRoles: [],
  setCurrentWorkspace: () => {},
  fetchWorkspaces: () => {},
  refetchCurrentWorkspace: () => {},
});

export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [initialLoadingDone, setInitialLoadingDone] = useState(false);
  const workspaceService = WorkspaceService.getInstance();
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );

  // Fetch the workspaces data
  const fetchWorkspaces = useCallback(async () => {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      const offlineWorkspace = {
        id: 0,
        name: 'Offline workspace',
        slug: 'offline-workspace',
        owner_id: 0,
      };
      setWorkspaces([offlineWorkspace]);
      setCurrentWorkspace(offlineWorkspace);
      return;
    }
    try {
      const data = await workspaceService.getWorkspaces();
      if (Array.isArray(data)) {
        setWorkspaces(data);
      } else {
        setWorkspaces(null);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces(null);
    }
  }, [workspaceService]);

  // Refetch current workspace
  const refetchCurrentWorkspace = useCallback(async () => {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) return;
    try {
      const currentWorkspaceSlug = currentWorkspace?.slug;
      if (!currentWorkspaceSlug) return;
      workspaceService
        .switchWorkspace(currentWorkspaceSlug)
        .then((newWorkspace) => {
          if (!newWorkspace) return;
          setCurrentWorkspace(newWorkspace);
          setWorkspaces((prevWorkspaces) => {
            if (!prevWorkspaces) return [];
            return prevWorkspaces.map((workspace) => {
              if (workspace.slug === newWorkspace.slug) {
                return newWorkspace;
              }
              return workspace;
            });
          });
        })
        .catch((error) => {
          console.error(
            'Error refetching current workspace:',
            currentWorkspaceSlug,
            error
          );
        });
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces(null);
    }
  }, [workspaceService, currentWorkspace]);

  // Fetch the roles data
  const fetchRoles = useCallback(async () => {
    try {
      const data = await workspaceService.getIrminRoles();
      setIrminRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
    }
  }, [workspaceService]);

  // Perform initial data fetching
  useEffect(() => {
    fetchWorkspaces();
    fetchRoles();
    const currentWorkspaceSlug = localStorage.getItem('currentWorkspaceSlug');
    if (currentWorkspaceSlug && !initialLoadingDone) {
      workspaceService
        .switchWorkspace(currentWorkspaceSlug)
        .then((newWorkspace) => {
          setCurrentWorkspace(newWorkspace);
        })
        .catch((error) => {
          console.error(
            'Error performing initial switch to workspace:',
            'Workspace slug: ' + currentWorkspaceSlug,
            error
          );
          localStorage.removeItem('currentWorkspaceSlug');
        })
        .finally(() => {
          setInitialLoadingDone(true);
        });
    } else {
      setInitialLoadingDone(true);
    }
  }, [fetchWorkspaces, fetchRoles, workspaceService, initialLoadingDone]);

  const handleSetCurrentWorkspace = (workspace: Workspace | null) => {
    if (workspace) {
      localStorage.setItem('currentWorkspaceSlug', workspace.slug.toString());
    } else {
      localStorage.removeItem('currentWorkspaceSlug');
    }
    setCurrentWorkspace(workspace);
  };

  if (!initialLoadingDone) return <></>;
  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        irminRoles,
        setCurrentWorkspace: handleSetCurrentWorkspace,
        fetchWorkspaces,
        refetchCurrentWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
