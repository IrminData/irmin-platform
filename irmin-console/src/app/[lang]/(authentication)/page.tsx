import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

import { getServerDict } from '@/lib/dict/server';

type AuthRootParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<AuthRootParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.auth.resolving };
}

/**
 * Routing stub — redirects to /sign-in or /workspace based on auth state.
 */
const ConsoleHome = async () => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  else redirect('/workspace');
};

export default ConsoleHome;
