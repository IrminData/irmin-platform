import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

/**
 * URL parameters for the User Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param user - The ID of the workspace user to show audit logs for
 */
export type UserLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  user: string;
};

/**
 * SEO metadata for the User Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<UserLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `User logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
