// Workspace DB schema - this is the schema for the Workspace DB, a data warehouse that stores the data of a workspace
export interface WorkspaceDB {
  [table_alias: string]: TableRow[] | TableAlias[];
  table_aliases: TableAlias[];
}
interface TableAlias {
  id: number;
  index: number; // Table's index in the workspace DB within same names. If no duplicates, index is 0.
  original: string; // The original table name as it is originally sourced as
  alias: string; // A generate UUID of a maximum of 53 characters to be used as the table name in the workspace DB
}
interface TableRow {
  [column: string]: string | number | boolean | null;
}
