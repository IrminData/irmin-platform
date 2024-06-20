import { IrminAPIResponse } from './IrminAPIResponse';

export interface User {
  id: number;
  name: string;
  company: string | null;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileAPIResponse extends IrminAPIResponse {
  data: User;
}
