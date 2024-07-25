/**
 * Website navigation link type. Wordpress Menus will be converted to this type.
 * See `transformMenu` in `src/lib/utils/menuUtils.ts`.
 * @typeParam href - Link href
 * @typeParam label - Link label
 * @typeParam subpages - Subpages of the link
 */
export interface WebsiteNavigationLink {
  href: string;
  label: string;
  subpages: { href: string; label: string }[];
}

/**
 * Website footer link section type. Wordpress Menus will be converted to this type.
 * See `transformMenuToFooterLinks` in `src/lib/utils/menuUtils.ts`.
 * @typeParam title - Section title
 * @typeParam links - Links in the section
 * @example See `src/lib/utils/menuUtils.ts`
 */
export interface WebsiteFooterLinkSection {
  title: string;
  links: WebsiteFooterLink[];
}

/**
 * Website footer link, which is shown within a footer link section.
 * @typeParam href - Link href
 * @typeParam label - Link label
 */
export interface WebsiteFooterLink {
  href: string;
  label: string;
}
