import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';
import { getServerDict } from '@/lib/dict/server';

import ScriptLayoutWrapper from '@/components/scripts/ScriptLayoutWrapper';

import { ScriptEditorProvider } from '@/context/ScriptEditorContext';

/**
 * URL parameters for the Scripts layout
 */
export type ScriptsLayoutParams = {
  lang: Locale;
  workspace: string;
};

export async function generateMetadata(props: {
  params: Promise<ScriptsLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.scripts };
}

/**
 * Layout for the Scripts page in the Console
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
