import { ComponentPropsWithoutRef } from 'react';

/**
 * Navigation link for the portal.
 * @typeParam title - Link title
 * @typeParam active - Link active status
 * @typeParam icon - Link icon
 * @typeParam href - Link href
 * @typeParam action - Link action
 * @typeParam props - Link props
 */
export interface PortalNavigationLink {
  title: string;
  active: boolean;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  props?: ComponentPropsWithoutRef<'a'> | ComponentPropsWithoutRef<'button'>;
}
