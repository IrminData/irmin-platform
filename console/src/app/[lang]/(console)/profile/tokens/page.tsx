import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import TokensSection from '@/components/user/TokensSection';

type TokensParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<TokensParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.workspace.profileTokens };
}

export default async function TokensPage() {
  return <TokensSection />;
}
