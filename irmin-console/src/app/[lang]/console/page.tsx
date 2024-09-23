'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

/**
 * This page doesn't really exit. It will be redirected to /manage-workspaces or the desired workspace.
 */
const ConsolePage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/console/manage-workspaces');
  }, [router]);
  return <></>;
};

export default ConsolePage;
