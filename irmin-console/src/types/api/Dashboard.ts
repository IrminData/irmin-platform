import { Widget } from '@/types/api/Widget';

/**
 * Dashboard type
 *
 * @typeParam id - Dashboard ID
 * @typeParam name - Dashboard name
 * @typeParam slug - Dashboard slug
 * @typeParam widgets - Array of Widgets to show on the dashboard, in correct order
 * @typeParam created_at - Dashboard creation date
 * @typeParam updated_at - Dashboard update date
 */
export interface Dashboard {
  id: number;
  name: string;
  slug: string;
  widgets?: Widget[] | null;
  created_at: string;
  updated_at: string;
}
