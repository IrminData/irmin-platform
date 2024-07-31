import { dictionaries, languages } from '@/dictionaries';
import WordPress from '@/services/wordpress';

import WebsiteFooterContent from '@/components/website/websiteFooterContent';

import { transformMenuToFooterLinks } from '@/utils/menu';

import { WebsiteFooterLinkSection } from '@/types/website/WebsiteNavigation';

/**
 * Website footer
 *
 * @remarks
 *
 * This component is used to display the footer on the website. It is used in the website layout.
 * It fetches the footer links from the WordPress API and displays them in the {@link WebsiteFooterContent} component.
 */
export default async function WebsiteFooter() {
  const wordpress = WordPress.getInstance();

  // Object to store footer links for each language
  const navLinksForLocales: {
    [key: string]: WebsiteFooterLinkSection[];
  } = {};

  // Loop through all languages and fetch the main menu for each language
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];

    // Get the menu slug for the current language from the dictionary
    const menuSlug = dictionaries[language.code].static.wordpressFooterMenuSlug;

    // Fetch the menu
    const menu = await wordpress.getMenu(menuSlug);
    const navLinks = [];
    if (menu) {
      // Transform the menu into navigation links and add them to the array
      navLinks.push(...transformMenuToFooterLinks(menu));
    }

    // Add the locale to the navLinksForLocales object
    navLinksForLocales[language.code] = navLinks;
  }
  return <WebsiteFooterContent footerLinks={navLinksForLocales} />;
}
