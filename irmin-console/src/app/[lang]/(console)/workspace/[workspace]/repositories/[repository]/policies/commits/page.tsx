import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policiesCommits };
}

/**
 * Page for the Repository commits policies
 */
export default async function RepositoryCommitsPoliciesPage() {
  return <RepositoryPoliciesSection type={'repository_commit'} />;
}
