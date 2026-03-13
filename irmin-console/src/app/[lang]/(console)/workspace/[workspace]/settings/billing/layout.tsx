import { notFound } from 'next/navigation';

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
  if (process.env.NEXT_PUBLIC_BILLING_DISABLED === 'true') {
    return notFound();
  }

  return <>{children}</>;
}
