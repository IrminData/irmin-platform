import { Metadata } from 'next';

/**
 * SEO metadata for the Profile pages
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My Profile | IRMIN Portal`,
  };
}

/**
 * Layout for the Profile pages in the Portal
 */
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='container relative mx-auto max-w-6xl'>{children}</div>;
}
