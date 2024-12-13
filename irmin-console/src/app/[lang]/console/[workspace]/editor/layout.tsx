import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getEditorItems } from '@/lib/actions/editor-items';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

import EditorLayoutWrapper from '@/components/editor/EditorLayoutWrapper';

import { EditorProvider } from '@/context/EditorContext';

/**
 * URL parameters for the Editor layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 */
export type EditorLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * SEO metadata for the Editor layout
 */
export async function generateMetadata(props: {
  params: Promise<EditorLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Editor | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Editor page in the Console
 * @param children - The children to render
 */
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<EditorLayoutParams>;
}) {
  const token = await getToken();
  const editorItems = await getEditorItems(token);
  if (!editorItems) return notFound();
  return (
    <EditorProvider editorItems={editorItems}>
      <EditorLayoutWrapper>{children}</EditorLayoutWrapper>
    </EditorProvider>
  );
}
