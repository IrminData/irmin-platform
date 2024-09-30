'use client';

import { useMemo } from 'react';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import { IoDocumentText } from 'react-icons/io5';
import { TbSchema } from 'react-icons/tb';

import Tabs from '@/components/common/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout wrapper UI for the Documentations pages in the Console
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
        name: dict.documentation.documentation,
        slug: 'documentation',
        link: `/${params.lang}/console/${params.workspace}/documentation`,
      },
      {
        icon: <TbSchema />,
        name: dict.documentation.schema,
        slug: 'schemas',
        link: `/${params.lang}/console/${params.workspace}/documentation/schema`,
      },
    ],
    [dict, params.lang, params.workspace]
  );
  return (
    <div id='console-documentation-layout-wrapper'>
      <div className='container relative mx-auto max-w-6xl'>
        <Tabs tabs={tabs} />
      </div>
      {children}
    </div>
  );
}
