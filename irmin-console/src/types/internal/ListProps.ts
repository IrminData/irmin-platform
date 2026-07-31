import type { JSX } from 'react';

/**
 * Action that can be taken on a table row, shown as a button at the end of the row
 */
export type TableRowAction = {
  /** Label of the action button */
  label: string;
  /** Whether the action is the primary action */
  primary: boolean;
  /** URL to navigate to when the action is taken */
  href?: string;
  /** Function to call when the action is taken */
  onClick?: () => void;
};

/**
 * Row of a table
 */
export type GridRow = {
  /** Columns of the row */
  columns: JSX.Element[];
  /** Actions that can be taken on the row */
  actions?: TableRowAction[];
  /** Details that can be shown when the row is expanded */
  details?: JSX.Element;
};

/**
 * Action for empty state component
 */
export type EmptyStateAction = {
  /** Label for the action button */
  label: string;
  /** Function to call when the action is clicked */
  onClick?: () => void;
  /** URL to navigate to when the action is clicked */
  href?: string;
  /** Button variant */
  variant?:
    | 'default'
    | 'ghost'
    | 'gradient'
    | 'gray'
    | 'link'
    | 'outline'
    | 'secondary';
};

/**
 * Props for the NormalList and CardList UI components
 * @example used for displaying a list of connections, actions, exports, repositories, etc.
 */
export type ListProps = {
  /** Whether the list is loading */
  loading?: boolean;
  /** Rows of the list */
  rows: GridRow[];
  /** Headers of the list */
  headers: string[];
  /** Whether to hide the headers of the list */
  hideHeaders?: boolean;
  /** Whether to hide the actions of the list */
  noActions?: boolean;
  /** Title of the empty state when there are no rows */
  emptyStateTitle?: string;
  /** Description of the empty state when there are no rows */
  emptyStateDescription?: string;
  /** Action to show in the empty state when there are no rows */
  emptyStateAction?: EmptyStateAction;
};
