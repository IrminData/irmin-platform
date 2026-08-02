import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import ConnectionDocumentationSection from '@/components/connection/ConnectionDocumentationSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.documentation };
}

/**
 * Page for the Connection documentation
 */
export default async function ConnectionDocumentationPage() {
  return <ConnectionDocumentationSection />;
}
