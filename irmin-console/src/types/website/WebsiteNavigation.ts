/**
 * Website navigation link type. Wordpress Menus will be converted to this type.
 * See `transformMenu` in `src/utils/menuUtils.ts`.
 */
export interface WebsiteNavigationLink {
  /** Link href */
  href: string;
  /** Link label */
  label: string;
  /** Subpages of the link */
  subpages: { href: string; label: string }[];
}

/**
 * Website footer link section type. Wordpress Menus will be converted to this type.
 * See `transformMenuToFooterLinks` in `src/utils/menuUtils.ts`.
 * @example See `src/utils/menuUtils.ts`
 */
export interface WebsiteFooterLinkSection {
  /** Section title */
  title: string;
  /** Links in the section */
  links: WebsiteFooterLink[];
}

/**
 * Website footer link, which is shown within a footer link section.
 */
export interface WebsiteFooterLink {
  /** Link href */
  href: string;
  /** Link label */
  label: string;
}
