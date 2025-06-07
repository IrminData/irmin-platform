import { ComponentPropsWithoutRef } from 'react';

/**
 * Navigation link for the console.
 */
export interface ConsoleNavigationLinkType {
  /** Link title */
  title: string;
  /** Link active status */
  active: boolean;
  /** Link icon */
  icon?: React.ReactNode;
  /** Link href */
  href?: string;
  /** Link action */
  action?: () => void;
  /** Link props */
  props?: ComponentPropsWithoutRef<'a'> | ComponentPropsWithoutRef<'button'>;
  /** Only show this link if in a workspace */
  workspaceOnly?: boolean;
  /** Optionally hide this link */
  hide?: boolean;
}
