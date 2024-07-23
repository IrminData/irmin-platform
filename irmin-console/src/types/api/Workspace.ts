import { IrminRole } from './IrminRole';

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
  roles?: IrminRole[];
}
