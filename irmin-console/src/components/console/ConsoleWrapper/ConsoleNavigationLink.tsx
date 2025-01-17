import { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

import { ConsoleNavigationLinkType } from '@/types/internal/ConsoleNavigation';

/**
 * Navigation link for the console
 *
 * @param props - The props of the component
 * @param props.link - The link object
 * @param props.isMenuFolded - The menu folded status
 * @param props.hasWorkspace - The workspace status - eg. if the user is in a workspace
 * @param props.setIsMenuOpen - The function to set the menu open status
 */
export default function ConsoleNavigationLink({
  link,
  isMenuFolded,
  hasWorkspace,
  setIsMenuOpen,
}: {
  link: ConsoleNavigationLinkType;
  isMenuFolded: boolean;
  hasWorkspace: boolean;
  setIsMenuOpen: (_value: boolean) => void;
}) {
  const menuIconStyles = `text-lg ${isMenuFolded ? 'ml-1' : 'mr-2'}`;
  const menuLinkStyles = `text-xs font-normal md:text-sm ${
    isMenuFolded ? 'hidden' : 'block'
  }`;

  if (link.workspaceOnly && !hasWorkspace) return null;

  if (link.href) {
    return (
      <li id='console-navigation-link'>
        <Link
          className={`flex items-center justify-between rounded-md p-3 py-3 hover:bg-primary/20 ${
            link.active ? 'bg-primary/10' : ''
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
          className={`flex items-center justify-between rounded-md p-3 py-3 hover:bg-primary/20 ${
            link.active ? 'bg-primary/10' : ''
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
