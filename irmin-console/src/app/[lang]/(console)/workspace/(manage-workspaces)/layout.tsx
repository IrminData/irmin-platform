import { Metadata } from 'next';

/**
 * SEO metadata for the Manage Workspaces pages
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Manage workspaces | IRMIN Console`,
  };
}

/**
 * Layout for the Manage Workspaces pages in the Console
 */
export default function ManageWorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='container relative mx-auto max-w-6xl'>{children}</div>;
}
