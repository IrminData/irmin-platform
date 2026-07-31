import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import ConnectionSettingsSection from '@/components/connection/ConnectionSettingsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.settings };
}

/**
 * Page for the Connection settings
 */
export default async function ConnectionSettingsPage() {
  return <ConnectionSettingsSection />;
}
