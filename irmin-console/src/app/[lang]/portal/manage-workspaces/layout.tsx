import { Metadata } from 'next';

/**
 * SEO metadata for the Manage Workspaces pages
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Manage workspaces | IRMIN Portal`,
  };
}

/**
 * Layout for the Manage Workspaces pages in the Portal
 */
export default function ManageWorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='container relative mx-auto max-w-6xl'>{children}</div>;
}
