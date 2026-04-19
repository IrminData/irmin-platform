'use client';

import { useMemo } from 'react';

import type { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import { IoDocumentText } from 'react-icons/io5';
import { TbSchema } from 'react-icons/tb';

import Tabs from '@/components/ui/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout wrapper UI for the Catalog & Lineage pages.
 *
 * Naming note: the component and the enclosing folder (`src/components/
 * documentation/`) still say "Documentation" because the core API, DB
 * schema, and SDK all use that term. The UI was renamed (tab labels
 * become "Catalog" + "Lineage", route became `/catalog/*`, dashboard
 * button became "Catalog & Lineage") but the internal naming was kept
 * deliberately to preserve cross-repo consistency with `irmin`,
 * `irmin-sdk-go`, and `irmin-core`. Don't rename the component or folder
 * to match the URL unless you're doing a coordinated backend rename.
 */
export default function DocumentationLayoutWrapper({
  params,
  children,
}: {
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  const tabs = useMemo(
    () => [
      {
        icon: <IoDocumentText />,
        name: dict.catalog.documentation,
        slug: 'catalog',
        link: `/${params.lang}/workspace/${params.workspace}/catalog`,
      },
      {
        icon: <TbSchema />,
        name: dict.catalog.schema,
        slug: 'lineage',
        link: `/${params.lang}/workspace/${params.workspace}/catalog/lineage`,
      },
    ],
    [dict, params.lang, params.workspace]
  );
  return (
    <div
      id='console-documentation-layout-wrapper'
      className='min-h-screen bg-background text-foreground'
    >
      <div className='container mx-auto max-w-6xl p-4'>
        <Tabs tabs={tabs} />
      </div>
      <div>{children}</div>
    </div>
  );
}
