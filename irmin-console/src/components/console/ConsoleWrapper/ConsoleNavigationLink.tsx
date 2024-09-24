import { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

import { ConsoleNavigationLinkType } from '@/types/internal/ConsoleNavigation';

/**
 * Navigation link for the console
 */
export default function ConsoleNavigationLink({
  link,
  isMenuFolded,
  setIsMenuOpen,
}: {
  link: ConsoleNavigationLinkType;
  isMenuFolded: boolean;
  setIsMenuOpen: (_value: boolean) => void;
}) {
  const menuIconStyles = `text-lg ${isMenuFolded ? 'ml-1' : 'mr-2'}`;
  const menuLinkStyles = `text-xs font-normal md:text-sm ${
    isMenuFolded ? 'hidden' : 'block'
  }`;

  if (link.href) {
    return (
      <li id='console-navigation-link'>
        <Link
          className={`flex items-center justify-between rounded-md p-3 py-3 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 ${
            link.active ? 'bg-gray-200 dark:bg-gray-800' : ''
          } overflow-hidden transition-all ${isMenuFolded ? 'w-12' : 'w-full'}`}
          href={link.href}
          onClick={() => setIsMenuOpen(false)}
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
      <li id='console-navigation-link'>
        <button
          className={`flex items-center justify-between rounded-md p-3 py-3 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 ${
            link.active ? 'bg-gray-200 dark:bg-gray-800' : ''
          } overflow-hidden transition-all ${isMenuFolded ? 'w-12' : 'w-full'}`}
          onClick={() => {
            setIsMenuOpen(false);
            if (link.action) link.action();
          }}
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
