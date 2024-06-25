import { User } from './UserProfile';
import { IrminAPIResponse } from './IrminAPIResponse';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner?: User;
}

export interface WorkspaceUser {
  id: number;
  name: string;
  company: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  inviteId: boolean | number;
  workspace: Workspace;
  roles: number[];
}

export interface WorkspaceInviteUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  deleted_at: any;
  user: any;
  workspace: Workspace;
  role: WorkspaceInviteRole;
}

export interface WorkspaceInviteRole {
  id: number;
  name: string;
  label: string;
  description: string;
}

export interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace | Workspace[];
}
