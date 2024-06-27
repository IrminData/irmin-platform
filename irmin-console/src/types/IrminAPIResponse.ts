import { User } from './UserProfile';
import { Workspace } from './Workspace';

export interface IrminAPIResponse {
  metadata?: {
    [key: string]: string;
  };
  message?: string;
  errors?: {
    [key: string]: string[];
  };
}

/**
 * Workspace API Response Interface
 */
export interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace;
}

export interface WorkspacesAPIResponse extends IrminAPIResponse {
  data: Workspace[];
}

/**
 * User Profile API Response Interface
 */
export interface UserProfileAPIResponse extends IrminAPIResponse {
  data: User;
}
