import { User } from './UserProfile';
import { IrminAPIResponse } from './IrminAPIResponse';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner?: User;
}

export interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace | Workspace[];
}
