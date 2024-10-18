import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import EditorLayoutWrapper from '@/components/bucket/EditorLayoutWrapper';

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
export default function EditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  params: EditorLayoutParams;
}>) {
  return <EditorLayoutWrapper>{children}</EditorLayoutWrapper>;
}
