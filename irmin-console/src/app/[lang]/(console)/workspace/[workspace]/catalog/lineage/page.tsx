import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import DocumentationSchemaSection from '@/components/documentation/DocumentationSchemaSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.lineage };
}

/**
 * Page to show the schema documentation for the workspace (lineage view)
 */
export default async function DocumentationSchemaPage() {
  return <DocumentationSchemaSection />;
}
