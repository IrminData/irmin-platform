import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policiesTags };
}

/**
 * Page for the Repository tags policies
 */
export default async function RepositoryTagsPoliciesPage() {
  return <RepositoryPoliciesSection type={'repository_tag'} />;
}
