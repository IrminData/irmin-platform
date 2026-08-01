export type TableCellValue = Date | boolean | number | string;
/**
 * Interface for defining a single row in a table.
 */
export interface TableRow {
  [key: string]: TableCellValue;
}
