import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import AIApplicationSettingsSection from '@/components/ai-application/AIApplicationSettingsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.settings };
}

/**
 * Settings page for AI Application
 */
export default async function AIApplicationSettingsPage() {
  return <AIApplicationSettingsSection />;
}
