import { User } from './UserProfile';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
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
  roles: IrminRole[];
}

export interface WorkspaceInviteUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  user: User;
  workspace: Workspace;
  role: IrminRole;
}

export interface IrminRole {
  id: number;
  name: string;
  label: string;
  description: string;
}
