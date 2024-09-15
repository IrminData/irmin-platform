'use client';

import { createContext, useContext } from 'react';

import { WorkspaceProvider } from '@/context/workspace/WorkspaceProvider';

import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { Repository } from '@/types/api/Repository';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Context for the workspace
 */
const WorkspaceContext = createContext<{
  workspaceLoading: boolean;
  irminRoles: IrminRole[];
  workspaces: {
    workspaces: Workspace[];
    fetchWorkspaces: () => Promise<Workspace[] | undefined>;
    switchWorkspace: (_workspaceSlug: string | null) => void;
    deleteCurrentWorkspace: () => Promise<IrminAPIResponse>;
    transferOwnership: (_userId: number) => Promise<IrminAPIResponse>;
    createWorkspace: (
      _name: string,
      _description: string
    ) => Promise<IrminAPIResponse>;
    updateWorkspace: (_workspace: Workspace) => Promise<IrminAPIResponse>;
    currentWorkspace: Workspace | null;
    workspacesLoading: boolean;
  };
  users: {
    users: WorkspaceUser[];
    isLoading: boolean;
    fetchUsers: (_forceFetch?: boolean) => void;
    deleteUser: (_userId: number) => Promise<IrminAPIResponse>;
    changeUserRole: (
      _userId: number,
      _role: IrminRoleNames
    ) => Promise<IrminAPIResponse>;
  };
  invites: {
    invites: Invite[];
    isLoading: boolean;
    fetchInvites: (_forceFetch?: boolean) => void;
    sendInvite: (
      _name: string,
      _email: string,
      _role: IrminRoleNames
    ) => Promise<IrminAPIResponse>;
    resendInvite: (_inviteId: number) => Promise<IrminAPIResponse>;
    cancelInvite: (_inviteId: number) => Promise<IrminAPIResponse>;
    changeInvite: (
      _inviteId: number,
      _role: IrminRole
    ) => Promise<IrminAPIResponse>;
  };
  connections: {
    connections: ConnectionWorkflow[];
    isLoading: boolean;
    fetchConnections: (_forceFetch?: boolean) => void;
  };
  exports: {
    exports: ExportWorkflow[];
    isLoading: boolean;
    fetchExports: (_forceFetch?: boolean) => void;
  };
  actions: {
    actions: ActionWorkflow[];
    isLoading: boolean;
    fetchActions: (_forceFetch?: boolean) => void;
  };
  repositories: {
    repositories: Repository[];
    isLoading: boolean;
    fetchRepositories: (_forceFetch?: boolean) => void;
    createRepository: (_dataRepo: Repository) => Promise<IrminAPIResponse>;
    updateRepository: (
      _dataRepoSlug: string,
      _updatedRepository: Repository
    ) => Promise<IrminAPIResponse>;
    deleteRepository: (_dataRepoSlug: string) => Promise<IrminAPIResponse>;
    reassignRepository: (
      _dataRepo: Repository,
      _newOwner: WorkspaceUser
    ) => Promise<IrminAPIResponse>;
  };
  workflows: {
    allWorkflows: Workflow[];
    workflowRuns: WorkflowRun[];
    workflowRunsLoading: boolean;
    fetchWorkflowRuns: (_forceFetch?: boolean) => void;
    fetchWorkflowRunsByWorkflow: (_workflowId: number) => void;
    updateWorkflow: (
      _workflowId: number,
      _updatedWorkflow: Workflow
    ) => Promise<IrminAPIResponse>;
    reassignWorkflow: (
      _workflowId: number,
      _newOwner: WorkspaceUser
    ) => Promise<IrminAPIResponse>;
    deleteWorkflow: (_workflowId: number) => Promise<IrminAPIResponse>;
    pauseWorkflow: (_workflowId: number) => Promise<IrminAPIResponse>;
    resumeWorkflow: (_workflowId: number) => Promise<IrminAPIResponse>;
  };
}>({
  workspaceLoading: false,
  irminRoles: [],
  workspaces: {
    workspaces: [],
    switchWorkspace: () => {},
    fetchWorkspaces: () => Promise.resolve([]),
    deleteCurrentWorkspace: () => Promise.resolve({}),
    transferOwnership: () => Promise.resolve({}),
    createWorkspace: () => Promise.resolve({}),
    updateWorkspace: () => Promise.resolve({}),
    workspacesLoading: false,
    currentWorkspace: null,
  },
  users: {
    users: [],
    isLoading: false,
    fetchUsers: () => {},
    deleteUser: () => Promise.resolve({}),
    changeUserRole: () => Promise.resolve({}),
  },
  invites: {
    invites: [],
    isLoading: false,
    fetchInvites: () => {},
    sendInvite: () => Promise.resolve({}),
    resendInvite: () => Promise.resolve({}),
    cancelInvite: () => Promise.resolve({}),
    changeInvite: () => Promise.resolve({}),
  },
  connections: {
    connections: [],
    isLoading: false,
    fetchConnections: () => {},
  },
  exports: {
    exports: [],
    isLoading: false,
    fetchExports: () => {},
  },
  actions: {
    actions: [],
    isLoading: false,
    fetchActions: () => {},
  },
  repositories: {
    repositories: [],
    isLoading: false,
    fetchRepositories: () => {},
    createRepository: () => Promise.resolve({}),
    updateRepository: () => Promise.resolve({}),
    deleteRepository: () => Promise.resolve({}),
    reassignRepository: () => Promise.resolve({}),
  },
  workflows: {
    allWorkflows: [],
    workflowRuns: [],
    workflowRunsLoading: false,
    fetchWorkflowRuns: () => {},
    fetchWorkflowRunsByWorkflow: () => {},
    updateWorkflow: () => Promise.resolve({}),
    reassignWorkflow: () => Promise.resolve({}),
    deleteWorkflow: () => Promise.resolve({}),
    pauseWorkflow: () => Promise.resolve({}),
    resumeWorkflow: () => Promise.resolve({}),
  },
});

/**
 * Hook to use the workspace context
 */
const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

/**
 * Provide entry point for the Workspace context
 */
export { useWorkspace, WorkspaceContext, WorkspaceProvider };
