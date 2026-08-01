import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import ConnectionPoliciesSection from '@/components/connection/ConnectionPoliciesSection';

import type { SingleConnectionLayoutParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.policies };
}

/**
 * Page for the Connection policies
 */
export default async function ConnectionPoliciesPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;
  return <ConnectionPoliciesSection connectionID={params.connection} />;
}
