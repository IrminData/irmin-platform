import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import AIApplicationPoliciesSection from '@/components/ai-application/AIApplicationPoliciesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policies };
}

/**
 * Policies page for AI Application
 */
export default async function AIApplicationPoliciesPage() {
  return <AIApplicationPoliciesSection />;
}
