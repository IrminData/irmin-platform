import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositorySettingsSection from '@/components/repository/RepositorySettingsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.settings };
}

/**
 * Page for the Repository settings
 */
export default async function RepositorySettingsPage() {
  return <RepositorySettingsSection />;
}
