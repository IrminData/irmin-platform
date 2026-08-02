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
  /** The onClick of the tab */
  onClick?: () => void;
  /** Whether the tab is hidden */
  hidden?: boolean;
  /** Whether the tab is active */
  active?: boolean;
  /**
   * Optional tooltip shown on hover/focus. Use for tab labels that aren't
   * self-evident (jargon, industry terms, abbreviations) or where the tab
   * content differs from what the label suggests. Rendered via the Tooltip
   * primitive when the Tabs component detects it.
   */
  tooltip?: string;
}
