import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import QueryPoliciesSection from '@/components/query/QueryPoliciesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policies };
}

/**
 * Query Policies page in the workspace
 */
export default async function QueriesPoliciesPage(props: {
  searchParams: Promise<{ queryID?: string }>;
}) {
  const searchParams = await props.searchParams;

  return <QueryPoliciesSection queryID={searchParams.queryID} />;
}
