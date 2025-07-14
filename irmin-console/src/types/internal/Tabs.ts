/**
 * Single tab object to be used across various tabs components in the UI
 */
export interface TabDetails {
  /** The slug of the tab */
  slug?: string;
  /** The name of the tab */
  name: string;
  /** The icon of the tab */
  icon?: React.JSX.Element;
  /** The content of the tab */
  content?: React.JSX.Element;
  /** The link of the tab */
  link?: string;
  /** Whether the tab is hidden */
  hidden?: boolean;
  /** Whether the tab is active */
  active?: boolean;
}
