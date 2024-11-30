export type TableCellValue = string | number | boolean | Date;
/**
 * Interface for defining a single row in a table.
 */
export interface TableRow {
  [key: string]: TableCellValue;
}
