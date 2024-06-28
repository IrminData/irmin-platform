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
import { ConnectionWithAdditionalData } from '@/types/Connection';

const WorkspaceContext = createContext<{
  workspaces: Workspace[] | null;
  currentWorkspace: Workspace | null;
  irminRoles: IrminRole[];
  connections: {
    connections: ConnectionWithAdditionalData[];
    isLoading: boolean;
    refetchConnections: () => void;
  };
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaces: () => void;
  refetchCurrentWorkspace: () => void;
}>({
  workspaces: null,
  currentWorkspace: null,
  irminRoles: [],
  connections: {
    connections: [],
    isLoading: false,
    refetchConnections: () => {},
  },
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
  const [connections, setConnections] = useState<
    ConnectionWithAdditionalData[]
  >([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

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
    const currentWorkspaceSlug = currentWorkspace?.slug;

    if (!currentWorkspaceSlug || offlineMode) return;

    try {
      const newWorkspace =
        await workspaceService.switchWorkspace(currentWorkspaceSlug);
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
    } catch (error) {
      console.error(
        'Error refetching current workspace:',
        currentWorkspaceSlug,
        error
      );
      setWorkspaces(null);
    }
  }, [workspaceService, currentWorkspace, setCurrentWorkspace, setWorkspaces]);

  // Fetch the roles data
  const fetchRoles = useCallback(async () => {
    try {
      const data = await workspaceService.getIrminRoles();
      setIrminRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
    }
  }, [workspaceService, setIrminRoles]);

  // Fetch the connections data
  const fetchConnections = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setConnectionsLoading(true);
      const res = await workspaceService.fetchConnectionsForWorkspace(
        currentWorkspace.slug
      );
      const newConnections: ConnectionWithAdditionalData[] = res.data.map(
        (conn) => ({
          ...conn,
          connector: 'PostgreSQL',
          nextSync: 'in 8 hours',
          nextSyncTimestamp: new Date(),
          status: 'errors',
          parts: [
            'ad_units',
            'ad_units_performance',
            'ad_units_performance_by_country',
            'ad_units_performance_by_device',
            'ad_units_performance_by_ad_size',
          ],
        })
      );
      setConnections(newConnections);
    } catch (error: any) {
      console.error('Failed to fetch connections: ', error);
    } finally {
      setConnectionsLoading(false);
    }
  }, [
    currentWorkspace,
    workspaceService,
    setConnections,
    setConnectionsLoading,
  ]);

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

  // Fetch workspace specific data
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

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
        connections: {
          connections,
          isLoading: connectionsLoading,
          refetchConnections: fetchConnections,
        },
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
