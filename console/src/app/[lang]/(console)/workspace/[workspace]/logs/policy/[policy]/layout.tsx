import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the Policy Logs layout
 */
export type PolicyLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  policy: string;
};

export async function generateMetadata(props: {
  params: Promise<PolicyLogsLayoutParams>;
}): Promise<Metadata> {
  const { policy } = await props.params;
  // Policies have no human-readable `name` field — they're identified by
  // {effect, action, resource}. Using a slug fallback keeps the tab title
  // informative without hitting the API for a tuple we can't render briefly.
  return { title: `${policy.slice(0, 8)}…` };
}

/**
 * Layout for the Policy Logs pages in the Console
 */
export default async function PolicyLogsLayout(props: {
  params: Promise<PolicyLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
