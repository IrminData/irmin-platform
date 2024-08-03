import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import DataRepoLayoutWrapper from '@/components/data-repository/DataRepoWrapper';

type LayoutParams = {
  lang: Locale;
  workspace: string;
  dataRepo: string;
};

/**
 * SEO metadata for the Data Repository layout
 */
export async function generateMetadata({
  params,
}: {
  params: LayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `${params.dataRepo} | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Data Repository pages in the Portal
 * @param props0 - The layout properties
 * @param props0.params - The layout parameters from Next JS router
 * @param props0.children - The children to render
 * @returns The Data Repository layout
 */
export default function PortalDataRepositoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LayoutParams;
}) {
  return (
    <DataRepoLayoutWrapper repoSlug={params.dataRepo}>
      {children}
    </DataRepoLayoutWrapper>
  );
}
