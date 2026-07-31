import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceBillingSection from '@/components/workspace/WorkspaceBillingSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.settingsSection.billing };
}

/**
 * Console Workspace billing settings page
 */
export default function WorkspaceBillingSettingsPage() {
  return <WorkspaceBillingSection />;
}
