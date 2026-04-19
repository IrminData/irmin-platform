import type { Metadata } from 'next';

import type { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import { getServerDict } from '@/lib/dict/server';

import DocumentationLayoutWrapper from '@/components/documentation/DocumentationLayoutWrapper';

/**
 * Catalog & Lineage route.
 *
 * URL is `/catalog` + `/catalog/lineage` (user-facing naming). The underlying
 * components, data fields, and permission keys all still say "documentation"
 * to match the core API / DB / SDK — only the UI layer was renamed. If you
 * touch this file and see "Documentation" in imports or symbol names, that's
 * intentional; don't rename those to align with the URL.
 */

export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.catalog };
}

/**
 * Layout for the Catalog & Lineage pages in the Console
 */
export default async function ConsoleCatalogLayout(props: {
  params: Promise<WorkspaceLayoutParams>;
  children: React.ReactNode;
}) {
  const params = await props.params;

  const { children } = props;

  return (
    <DocumentationLayoutWrapper params={params}>
      {children}
    </DocumentationLayoutWrapper>
  );
}
