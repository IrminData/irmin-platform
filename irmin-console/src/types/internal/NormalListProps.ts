/**
 * Action that can be taken on a table row, shown as a button at the end of the row
 * @typeParam label - Label of the action button
 * @typeParam primary - Whether the action is the primary action
 * @typeParam href - URL to navigate to when the action is taken
 * @typeParam onClick - Function to call when the action is taken
 */
export type TableRowAction = {
  label: string;
  primary: boolean;
  href?: string;
  onClick?: () => void;
};
/**
 * Row of a table
 * @typeParam columns - Columns of the row
 * @typeParam actions - Actions that can be taken on the row
 * @typeParam details - Details that can be shown when the row is expanded
 */
export type GridRow = {
  columns: JSX.Element[];
  actions?: TableRowAction[];
  details?: JSX.Element;
};
/**
 * Props for the NormalList UI component that displays a table list
 * @example used for displaying a list of connections, actions, exports, repositories, etc.
 */
export type NormalListProps = {
  rows: GridRow[];
  headers: string[];
  hideHeaders?: boolean;
};
