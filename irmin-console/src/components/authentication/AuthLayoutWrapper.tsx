'use client';

import React from 'react';

import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

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
    <WebsiteSectionWrapper id='auth-layout-wrapper'>
      <div className='container mx-auto mb-16 flex max-w-7xl flex-wrap px-4 py-16 md:mb-0 md:py-28'>
        {children}
      </div>
    </WebsiteSectionWrapper>
  );
}
