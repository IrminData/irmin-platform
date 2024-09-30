/**
 * Represents a row that can be rendered in a table.
 *
 * Just like TableRow, but dates are also allowed.
 */
export interface RenderableRow {
  [key: string]: string | number | boolean | Date;
}
