import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import AIApplicationActivitySection from '@/components/ai-application/AIApplicationActivitySection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.activity };
}

/**
 * Activity page for AI Application
 */
export default async function AIApplicationActivityPage() {
  return <AIApplicationActivitySection />;
}
