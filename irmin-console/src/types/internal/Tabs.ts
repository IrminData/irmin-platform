/**
 * Tab type used by different Tabs components in the UI
 */
export interface TabDetails {
  slug?: string;
  name: string;
  icon?: React.JSX.Element;
  content?: React.JSX.Element;
  link?: string;
  hidden?: boolean;
  active?: boolean;
}

/**
 * Array of {@link TabDetails} type
 */
export type TabsType = TabDetails[];
