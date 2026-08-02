import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspacePoliciesSection from '@/components/workspace/WorkspacePoliciesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policies };
}

/**
 * Console Workspace policies page
 */
export default function WorkspacePoliciesPage() {
  return <WorkspacePoliciesSection />;
}
