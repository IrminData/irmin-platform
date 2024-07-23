import { transformMenu } from '@/lib/utils/menuUtils';
import WordPress from '@/lib/wordpress';

import WebsiteNavigationContent from '@/components/website/websiteNavigationContent';

import { WebsiteNavigationLink } from '@/types/website/WebsiteNavigation';

export default async function WebsiteNavigation() {
  const wordpress = WordPress.getInstance();
  const navLinksEN: WebsiteNavigationLink[] = [];
  const navLinksFI: WebsiteNavigationLink[] = [];

  const menuEN = await wordpress.getMenu('primary-menu-en');
  if (menuEN) {
    navLinksEN.push(...transformMenu(menuEN));
  }

  const menuFI = await wordpress.getMenu('primary-menu-fi');
  if (menuFI) {
    navLinksFI.push(...transformMenu(menuFI));
  }

  return (
    <WebsiteNavigationContent navLinksEN={navLinksEN} navLinksFI={navLinksFI} />
  );
}
