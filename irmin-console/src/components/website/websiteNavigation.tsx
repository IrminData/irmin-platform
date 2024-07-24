import { dictionaries, languages } from '@/dictionaries';
import { transformMenu } from '@/lib/utils/menuUtils';
import WordPress from '@/lib/wordpress';

import WebsiteNavigationContent from '@/components/website/websiteNavigationContent';

import { WebsiteNavigationLink } from '@/types/website/WebsiteNavigation';

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
  }

  return <WebsiteNavigationContent navLinks={navLinksForLocales} />;
}
