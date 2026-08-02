import type { TableRow } from '@/types/internal/Datatable';

export interface AdvancedDatatableProps {
  items: TableRow[];
  // Future extensibility
  enableRowSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  onRowSelected?: (rows: TableRow[]) => void;
  // rowActions?: RowAction[];
}

export type ColumnType = 'boolean' | 'date' | 'float' | 'int' | 'string';
