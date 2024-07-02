'use client';

import { createContext } from 'react';

import { ConnectionWithAdditionalData } from '@/types/Connection';
import { IrminRole, Workspace } from '@/types/Workspace';

const WorkspaceContext = createContext<{
  workspaces: Workspace[] | null;
  workspaceLoading: boolean;
  currentWorkspace: Workspace | null;
  switchToWorkspace: (_workspaceSlug: string | null) => void;
  deleteCurrentWorkspace: () => void;
  fetchWorkspaces: (_forceFetch?: boolean) => void;
  irminRoles: IrminRole[];
  connections: {
    connections: ConnectionWithAdditionalData[];
    isLoading: boolean;
    fetchConnections: (_forceFetch?: boolean) => void;
  };
}>({
  workspaces: null,
  workspaceLoading: false,
  currentWorkspace: null,
  switchToWorkspace: () => {},
  deleteCurrentWorkspace: () => {},
  fetchWorkspaces: () => {},
  irminRoles: [],
  connections: {
    connections: [],
    isLoading: false,
    fetchConnections: () => {},
  },
});

export default WorkspaceContext;
