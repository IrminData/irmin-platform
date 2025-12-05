import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';

import ScriptLayoutWrapper from '@/components/scripts/ScriptLayoutWrapper';

import { ScriptEditorProvider } from '@/context/ScriptEditorContext';

/**
 * URL parameters for the Scripts layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type ScriptsLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Scripts layout
 */
export async function generateMetadata(props: {
  params: Promise<ScriptsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Scripts | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Scripts page in the Console
 * @param children - The children to render
 */
export default async function ScriptsLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<ScriptsLayoutParams>;
}) {
  return (
    <ScriptEditorProvider>
      <ScriptLayoutWrapper>{children}</ScriptLayoutWrapper>
    </ScriptEditorProvider>
  );
}
