/**
 * Workspace DB schema, which is a data warehouse that stores the data of the workspace
 * @typeParam table_alias - Tables with aliases as keys storing the data of the workspace DB
 * @typeParam table_aliases - A table that stores the aliases of the tables in the workspace DB
 */
export interface WorkspaceDB {
  [table_alias: string]: TableRow[] | TableAlias[];
  table_aliases: TableAlias[];
}

/**
 * Table alias type, which is a table that stores the aliases of the tables in the workspace DB.
 * Tables are always created with aliases to avoid conflicts with the original table names.
 * @typeParam id - Table alias ID
 * @typeParam index - Table's index in the workspace DB within same names. If no duplicates, index is 0.
 * @typeParam original - The original table name as it is originally sourced as
 * @typeParam alias - A generate UUID of a maximum of 53 characters to be used as the table name in the workspace DB
 */
interface TableAlias {
  id: number;
  index: number;
  original: string;
  alias: string;
}
interface TableRow {
  [column: string]: string | number | boolean | null;
}
