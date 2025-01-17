import React from 'react';

/**
 * Layout wrapper for authentication pages
 *
 * @param props - Authentication layout props
 */
export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id='auth-layout-wrapper'
      className='pattern-bg relative overflow-hidden bg-background bg-cover bg-top bg-no-repeat'
    >
      <div className='container mx-auto mb-16 flex min-h-screen max-w-7xl flex-wrap px-4 py-12 md:mb-0 md:py-20'>
        {children}
      </div>
    </div>
  );
}
