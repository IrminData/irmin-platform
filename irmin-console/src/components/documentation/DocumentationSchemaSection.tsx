'use client';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

const orgChart = {
  name: 'CEO',
  children: [
    {
      name: 'Manager',
      attributes: {
        department: 'Production',
      },
      children: [
        {
          name: 'Foreman',
          attributes: {
            department: 'Fabrication',
          },
        },
        {
          name: 'Foreman',
          attributes: {
            department: 'Assembly',
          },
        },
      ],
    },
  ],
};

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection() {
  const { dict } = useLocale();

  return (
    <>
      <div className='mb-4 px-2 md:px-4'>
        <PortalTitle title={dict.documentation.schema} />
      </div>
      <TreeChart tree={orgChart} />
    </>
  );
}
