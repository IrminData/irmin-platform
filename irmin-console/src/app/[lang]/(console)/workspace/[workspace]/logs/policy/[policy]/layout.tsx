import { Metadata } from 'next';

import { Locale } from '@/lib/dict';

/**
 * URL parameters for the Policy Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param policy - The ID of the policy to show logs for
 */
export type PolicyLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  policy: string;
};

/**
 * SEO metadata for the Policy Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<PolicyLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Policy logs | ${formattedWorkspace} | IRMIN Console`,
  };
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
