type TableRowAction = {
  label: string;
  primary: boolean;
  href?: string;
  onClick?: () => void;
};
export type GridRow = {
  columns: JSX.Element[];
  actions?: TableRowAction[];
  details?: JSX.Element;
};
export type GridProps = {
  rows: GridRow[];
  headers: string[];
  hideHeaders?: boolean;
};
