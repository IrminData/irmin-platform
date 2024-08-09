'use client';

import { MarkatplaceLayoutParams } from '@/app/[lang]/portal/[workspace]/(container)/marketplace/layout';

import { BsPlugin } from 'react-icons/bs';
import { FiDatabase, FiList } from 'react-icons/fi';
import { TbBuildingStore } from 'react-icons/tb';

import Tabs from '@/components/common/tabs/Tabs';

import { useLocale } from '@/context/LocaleContext';

/**
 * Layout for the Marketplace pages in the Portal
 */
export default function PortalMarketplaceLayoutWrapper({
  params,
  children,
}: {
  params: MarkatplaceLayoutParams;
  children: React.ReactNode;
}) {
  const { dict } = useLocale();
  return (
    <div id='portal-marketplace-layout-wrapper'>
      <Tabs
        tabs={[
          {
            icon: <TbBuildingStore />,
            name: dict.marketplace.marketplaceHome,
            slug: 'marketplace-home',
            link: `/${params.lang}/portal/${params.workspace}/marketplace`,
          },
          {
            icon: <FiDatabase />,
            name: dict.marketplace.dataMarketplace,
            slug: 'data-marketplace',
            link: `/${params.lang}/portal/${params.workspace}/marketplace/data`,
          },
          {
            icon: <BsPlugin />,
            name: dict.marketplace.pluginMarketplace,
            slug: 'plugin-marketplace',
            link: `/${params.lang}/portal/${params.workspace}/marketplace/plugin`,
          },
          {
            icon: <FiList />,
            name: dict.marketplace.myListings,
            slug: 'my-listings',
            link: `/${params.lang}/portal/${params.workspace}/marketplace/listings`,
          },
        ]}
      />
      {children}
    </div>
  );
}
