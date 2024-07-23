import { transformMenuToFooterLinks } from '@/lib/utils/menuUtils';
import WordPress from '@/lib/wordpress';

import WebsiteFooterContent from '@/components/website/websiteFooterContent';

import { WebsiteFooterLinkSection } from '@/types/website/WebsiteNavigation';

export default async function WebsiteFooter() {
  const wordpress = WordPress.getInstance();
  const footerLinksEN: WebsiteFooterLinkSection[] = [];
  const footerLinksFI: WebsiteFooterLinkSection[] = [];

  const menuEN = await wordpress.getMenu('footer-menu-en');
  if (menuEN) {
    footerLinksEN.push(...transformMenuToFooterLinks(menuEN));
  }

  const menuFI = await wordpress.getMenu('footer-menu-fi');
  if (menuFI) {
    footerLinksFI.push(...transformMenuToFooterLinks(menuFI));
  }

  return (
    <WebsiteFooterContent
      footerLinksEN={footerLinksEN}
      footerLinksFI={footerLinksFI}
    />
  );
}
