import { transformMenu, WebsiteNavLink } from '@/lib/menuUtils';
import WordPress from '@/lib/wordpress';

import WebsiteNavigationContent from '@/components/website/websiteNavigationContent';

export default async function WebsiteNavigation() {
  const wordpress = WordPress.getInstance();
  const navLinksEN: WebsiteNavLink[] = [];
  const navLinksFI: WebsiteNavLink[] = [];

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
