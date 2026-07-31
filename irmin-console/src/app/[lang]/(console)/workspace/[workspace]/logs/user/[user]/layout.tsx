import type { Metadata } from 'next';

import { fetchUserMeta, userDisplayName } from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the User Logs layout
 */
export type UserLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  user: string;
};

export async function generateMetadata(props: {
  params: Promise<UserLogsLayoutParams>;
}): Promise<Metadata> {
  const { lang, workspace, user } = await props.params;
  const u = await fetchUserMeta(lang, workspace, user);
  return { title: u ? userDisplayName(u) : `${user.slice(0, 8)}…` };
}

/**
 * Layout for the User Logs pages in the Console
 */
export default async function UserLogsLayout(props: {
  params: Promise<UserLogsLayoutParams>;
  children: React.ReactNode;
}) {
  return props.children;
}
