'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

/**
 * This page doesn't really exit. It will be redirected to /sign-in
 */
const ConsoleHome = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/sign-in');
  }, [router]);
  return <></>;
};

export default ConsoleHome;
