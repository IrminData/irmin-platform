export interface WebsiteNavigationLink {
  href: string;
  label: string;
  subpages: { href: string; label: string }[];
}

export interface WebsiteFooterLink {
  href: string;
  label: string;
}

export interface WebsiteFooterLinkSection {
  title: string;
  links: WebsiteFooterLink[];
}
