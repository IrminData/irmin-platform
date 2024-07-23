import { Widget } from './Widget';

export interface Dashboard {
  id: number;
  name: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}
