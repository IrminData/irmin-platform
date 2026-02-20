import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

export const metadata: Metadata = {
  title: 'Irmin',
  description: 'Irmin Data Platform',
};

/**
 * This page doesn't really exit. It will be redirected to /sign-in or /workspace based on the user's authentication status.
 */
const ConsoleHome = async () => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  else redirect('/workspace');
};

export default ConsoleHome;
