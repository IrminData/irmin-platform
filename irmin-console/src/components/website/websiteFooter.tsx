import {
  FooterLinkSection as FooterLinkSectionType,
  transformMenuToFooterLinks,
} from '@/lib/menuUtils';
import WordPress from '@/lib/wordpress';

import WebsiteFooterContent from '@/components/website/websiteFooterContent';

export default async function WebsiteFooter() {
  const wordpress = WordPress.getInstance();
  const footerLinksEN: FooterLinkSectionType[] = [];
  const footerLinksFI: FooterLinkSectionType[] = [];

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
