import { IrminRole } from './IrminRole';

export interface Invite {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}
