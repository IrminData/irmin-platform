import { ComponentPropsWithoutRef } from 'react';

export interface PortalNavigationLink {
  title: string;
  active: boolean;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  props?: ComponentPropsWithoutRef<'a'> | ComponentPropsWithoutRef<'button'>;
}
