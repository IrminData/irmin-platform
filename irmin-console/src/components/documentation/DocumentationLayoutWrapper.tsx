'use client';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';

import { IoDocumentText } from 'react-icons/io5';
import { TbSchema } from 'react-icons/tb';

import Tabs from '@/components/common/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout wrapper UI for the Documentations pages in the Portal
 */
export default function DocumentationLayoutWrapper({
  params,
  children,
}: {
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  return (
    <div id='portal-documentation-layout-wrapper'>
      <Tabs
        tabs={[
          {
            icon: <IoDocumentText />,
            name: dict.documentation.documentation,
            slug: 'documentation',
            link: `/${params.lang}/portal/${params.workspace}/documentation`,
          },
          {
            icon: <TbSchema />,
            name: dict.documentation.schema,
            slug: 'schemas',
            link: `/${params.lang}/portal/${params.workspace}/documentation/schema`,
          },
        ]}
      />
      <div className='relative'>{children}</div>
    </div>
  );
}
