import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import DashboardSection from '@/components/dashboard/DashboardSection';

type DashboardParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<DashboardParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.workspace.dashboard };
}

/**
 * Workspace dashboard page
 */
export default async function WorkspaceDashboardPage() {
  return <DashboardSection />;
}
