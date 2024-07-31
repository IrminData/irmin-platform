import { dictionaries, languages } from '@/dictionaries';
import WordPress from '@/services/wordpress';

import WebsiteNavigationContent from '@/components/website/websiteNavigationContent';

import { transformMenu } from '@/utils/menu';

import { WebsiteNavigationLink } from '@/types/website/WebsiteNavigation';

/**
 * Website navigation
 *
 * @remarks
 *
 * This component is used to display the navigation on the website. It is used in the website layout.
 * It fetches the navigation links from the WordPress API and displays them in the {@link WebsiteNavigationContent} component.
 */
export default async function WebsiteNavigation() {
  const wordpress = WordPress.getInstance();

  const navLinksForLocales: {
    [key: string]: WebsiteNavigationLink[];
  } = {};

  // Loop through all languages and fetch the main menu for each language
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];

    // Get the menu slug for the current language from the dictionary
    const menuSlug = dictionaries[language.code].static.wordpressMainMenuSlug;

    // Fetch the menu
    const menu = await wordpress.getMenu(menuSlug);
    const navLinks = [];
    if (menu) {
      // Transform the menu into navigation links and add them to the array
      navLinks.push(...transformMenu(menu));
    }

    // Add the locale to the navLinksForLocales object
    navLinksForLocales[language.code] = navLinks;
  }

  return <WebsiteNavigationContent navLinks={navLinksForLocales} />;
}
