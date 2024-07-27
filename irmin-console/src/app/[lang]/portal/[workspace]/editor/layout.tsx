import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import EditorWrapper from '@/components/editor/editorWrapper';

type LayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Editor layout
 */
export async function generateMetadata({
  params,
}: {
  params: LayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Editor | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Editor page in the Portal
 * @param children - The children to render
 * @returns The Editor layout
 */
export default function PortalEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <EditorWrapper>{children}</EditorWrapper>;
}
