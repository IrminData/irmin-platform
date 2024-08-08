'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

/**
 * This page doesn't really exit. It will be redirected to /manage-workspaces or the desired workspace.
 */
const PortalPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/portal/manage-workspaces');
  }, [router]);
  return <></>;
};

export default PortalPage;
