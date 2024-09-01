'use client';

import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

/**
 * Page UI to show the schema documentation for the workspace
 */
export default function DocumentationSchemaSection() {
  const { dict } = useLocale();

  return (
    <div className='px-2 md:px-4'>
      <PortalTitle title={dict.documentation.schema} />
    </div>
  );
}
