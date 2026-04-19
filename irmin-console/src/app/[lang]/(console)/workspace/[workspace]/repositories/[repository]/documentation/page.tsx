import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryDocumentationSection from '@/components/repository/RepositoryDocumentationSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.documentation };
}

/**
 * Page for the Repository documentation
 */
export default function RepositoryDocumentationPage() {
  return <RepositoryDocumentationSection />;
}
