import type { JSX } from 'react';

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
 * Props for the NormalList and CardList UI components
 * @example used for displaying a list of connections, actions, exports, repositories, etc.
 *
 * @typeParam loading - Whether the list is loading
 * @typeParam rows - Rows of the list
 * @typeParam headers - Headers of the list
 * @typeParam hideHeaders - Whether to hide the headers of the list
 * @typeParam noActions - Whether to hide the actions of the list
 */
export type ListProps = {
  loading?: boolean;
  rows: GridRow[];
  headers: string[];
  hideHeaders?: boolean;
  noActions?: boolean;
};
