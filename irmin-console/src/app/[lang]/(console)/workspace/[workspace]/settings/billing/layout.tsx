import { notFound } from 'next/navigation';

import { env } from '@/config/env.server';

/**
 * Layout for billing settings pages.
 * Returns 404 when billing is disabled, gating all nested routes.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (env.NEXT_PUBLIC_BILLING_DISABLED) {
    return notFound();
  }

  return <>{children}</>;
}
