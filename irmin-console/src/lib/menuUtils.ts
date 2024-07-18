import { getURL } from '@/lib/linkUtil';

import { Menu, MenuItem } from '@/types/Wordpress';

export interface WebsiteNavLink {
  href: string;
  label: string;
  subpages: { href: string; label: string }[];
}

// Function to transform Menu to WebsiteNavLink[]
export function transformMenu(menu: Menu): WebsiteNavLink[] {
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

  // Function to create WebsiteNavLink from MenuItem
  function createNavLink(item: MenuItem): WebsiteNavLink {
    return {
      href: getURL(item.url),
      label: item.title,
      subpages: [],
    };
  }

  // Generate the top-level WebsiteNavLinks and attach subpages
  const websiteNavLinks: WebsiteNavLink[] = parentMap['0'].map(
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

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterLinkSection {
  title: string;
  links: FooterLink[];
}

// Function to transform Menu to FooterLinkSection[]
export function transformMenuToFooterLinks(menu: Menu): FooterLinkSection[] {
  // Function to create FooterLink from MenuItem
  function createFooterLink(item: MenuItem): FooterLink {
    return {
      href: item.url.length > 0 ? getURL(item.url) : '',
      label: item.title,
    };
  }

  // Convert all MenuItems to FooterLinks
  const footerLinks: FooterLink[] = menu.map(createFooterLink);

  // Create FooterLinkSections
  const footerLinkSections: FooterLinkSection[] = [];
  let currentSection: FooterLinkSection | null = null;

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
