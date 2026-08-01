import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import AIApplicationDocumentationSection from '@/components/ai-application/AIApplicationDocumentationSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.documentation };
}

/**
 * Documentation page for AI Application
 */
export default async function AIApplicationDocumentationPage() {
  return <AIApplicationDocumentationSection />;
}
