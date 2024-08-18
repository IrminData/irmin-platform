import { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

import { PortalNavigationLinkType } from '@/types/internal/PortalNavigation';

/**
 * Navigation link for the portal
 */
export default function PortalNavigationLink({
  link,
  isMenuFolded,
  setIsMenuOpen,
}: {
  link: PortalNavigationLinkType;
  isMenuFolded: boolean;
  setIsMenuOpen: (_value: boolean) => void;
}) {
  const menuIconStyles = `text-lg ${isMenuFolded ? 'ml-1' : 'mr-2'}`;
  const menuLinkStyles = `text-xs font-light md:text-sm ${
    isMenuFolded ? 'hidden' : 'block'
  }`;

  if (link.href) {
    return (
      <li>
        <Link
          className={`flex items-center justify-between rounded-md p-3 py-3 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ${
            link.active ? 'bg-gray-200 dark:bg-gray-800' : ''
          } overflow-hidden transition-all ${isMenuFolded ? 'w-12' : 'w-full'}`}
          href={link.href}
          onClick={() => setIsMenuOpen(false)}
          aria-label={link.title}
          {...(link.props as ComponentPropsWithoutRef<'a'>)}
        >
          <div className={`flex w-full min-w-36 items-center justify-start`}>
            <div className={menuIconStyles}>{link.icon}</div>
            <p className={menuLinkStyles}>{link.title}</p>
          </div>
        </Link>
      </li>
    );
  } else {
    return (
      <li>
        <button
          className={`flex items-center justify-between rounded-md p-3 py-3 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ${
            link.active ? 'bg-gray-200 dark:bg-gray-800' : ''
          } overflow-hidden transition-all ${isMenuFolded ? 'w-12' : 'w-full'}`}
          onClick={() => {
            setIsMenuOpen(false);
            if (link.action) link.action();
          }}
          aria-label={link.title}
          {...(link.props as ComponentPropsWithoutRef<'button'>)}
        >
          <div className={`flex w-full min-w-36 items-center justify-start`}>
            <div className={menuIconStyles}>{link.icon}</div>
            <p className={menuLinkStyles}>{link.title}</p>
          </div>
        </button>
      </li>
    );
  }
}
