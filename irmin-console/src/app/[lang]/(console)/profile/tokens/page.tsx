import { Metadata } from 'next';

import TokensSection from '@/components/user/TokensSection';

/**
 * Page metadata for SEO on the tokens page
 */
export const metadata: Metadata = {
  title: 'API tokens | IRMIN',
  description: 'Edit your API tokens to access IRMIN programmatically.',
};

/**
 * User tokens page
 */
export default async function TokensPage() {
  return <TokensSection />;
}
