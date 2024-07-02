import { Connection } from './Connection';
import { ConnectionDetailsAndSettingsFields, Connector } from './Connector';
import { User } from './UserProfile';
import {
  IrminRole,
  Workspace,
  WorkspaceInviteUser,
  WorkspaceUser,
} from './Workspace';

export interface IrminAPIResponse {
  metadata?: {
    [key: string]: string;
  };
  message?: string;
  errors?: {
    [key: string]: string[];
  };
  data?: unknown[] | unknown;
}

/**
 * Workspace API Response Interfaces
 */
export interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace;
}

export interface WorkspacesAPIResponse extends IrminAPIResponse {
  data: Workspace[];
}
export interface WorkspaceUserAPIResponse extends IrminAPIResponse {
  data: WorkspaceUser[];
}
export interface WorkspaceRoleAPIResponse extends IrminAPIResponse {
  data: IrminRole[];
}
export interface WorkspaceInviteUsersAPIResponse extends IrminAPIResponse {
  data: WorkspaceInviteUser[];
}

/**
 * User Profile API Response Interfaces
 */
export interface UserProfilesAPIResponse extends IrminAPIResponse {
  data: User[];
}
export interface UserProfileAPIResponse extends IrminAPIResponse {
  data: User;
}

/**
 * Connector API Response Interfaces
 */
export interface ConnectorsAPIResponse extends IrminAPIResponse {
  data: Connector[];
}
export interface ConnectorAPIResponse extends IrminAPIResponse {
  data: Connector;
}

/**
 * Connection setup API Response Interfaces
 */
export interface ConnectionDetailsAndSettingsAPIResponse
  extends IrminAPIResponse {
  data: ConnectionDetailsAndSettingsFields;
}
export interface ConnectionTestAPIResponse extends IrminAPIResponse {
  data: {
    connected: boolean;
  };
}

/**
 * Connection API Response Interfaces
 */
export interface ConnectionsAPIResponse extends IrminAPIResponse {
  data: Connection[];
}
