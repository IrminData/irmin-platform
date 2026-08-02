import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

// `page.tsx` is a client component, so metadata goes on this sibling server
// layout. Wraps the success polling screen as a pass-through.

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.billingSuccess };
}

export default function BillingSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
