import { getURL } from '@/lib/utils/wordpressLinkUtils';

import {
  WebsiteFooterLink,
  WebsiteFooterLinkSection,
  WebsiteNavigationLink,
} from '@/types/website/WebsiteNavigation';
import { Menu, MenuItem } from '@/types/website/Wordpress';

// Function to transform Menu to WebsiteNavigationLink[]
export function transformMenu(menu: Menu): WebsiteNavigationLink[] {
  // Create a map to group items by their parent
  const parentMap: { [key: string]: MenuItem[] } = {};

  menu.forEach((item) => {
    const parentId = item.menu_item_parent || '0'; // Use '0' for top-level items
    if (!parentMap[parentId]) {
      parentMap[parentId] = [];
    }
    parentMap[parentId].push(item);
  });

  // Sort the items within each parent group by menu_order
  Object.keys(parentMap).forEach((parentId) => {
    parentMap[parentId].sort((a, b) => a.menu_order - b.menu_order);
  });

  // Function to create WebsiteNavigationLink from MenuItem
  function createNavLink(item: MenuItem): WebsiteNavigationLink {
    return {
      href: getURL(item.url),
      label: item.title,
      subpages: [],
    };
  }

  if (Object.prototype.hasOwnProperty.call(parentMap, '0')) {
    // Generate the top-level WebsiteNavigationLinks and attach subpages
    const websiteNavLinks: WebsiteNavigationLink[] = parentMap['0'].map(
      (topLevelItem) => {
        const navLink = createNavLink(topLevelItem);
        if (parentMap[topLevelItem.ID.toString()]) {
          navLink.subpages =
            parentMap[topLevelItem.ID.toString()].map(createNavLink);
        }
        return navLink;
      }
    );
    return websiteNavLinks;
  }
  return [];
}

// Function to transform Menu to WebsiteFooterLinkSection[]
export function transformMenuToFooterLinks(
  menu: Menu
): WebsiteFooterLinkSection[] {
  // Function to create WebsiteFooterLink from MenuItem
  function createFooterLink(item: MenuItem): WebsiteFooterLink {
    return {
      href: item.url.length > 0 ? getURL(item.url) : '',
      label: item.title,
    };
  }

  // Convert all MenuItems to FooterLinks
  const footerLinks: WebsiteFooterLink[] = menu.map(createFooterLink);

  // Create FooterLinkSections
  const footerLinkSections: WebsiteFooterLinkSection[] = [];
  let currentSection: WebsiteFooterLinkSection | null = null;

  footerLinks.forEach((link) => {
    if (!link.href || link.href === '#' || link.href === '') {
      // If the link has no URL, use it as a section title
      if (currentSection) {
        footerLinkSections.push(currentSection);
      }
      currentSection = {
        title: link.label,
        links: [],
      };
    } else {
      if (!currentSection) {
        // If there's no current section, create a default one
        currentSection = {
          title: 'Links',
          links: [],
        };
      }
      currentSection.links.push(link);
    }
  });

  // Push the last section if exists
  if (currentSection) {
    footerLinkSections.push(currentSection);
  }

  return footerLinkSections;
}
