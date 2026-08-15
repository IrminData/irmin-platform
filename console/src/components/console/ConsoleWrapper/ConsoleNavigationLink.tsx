import type { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

import type { ConsoleNavigationLinkType } from '@/types/internal/ConsoleNavigation';

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
  const menuIconStyles = `text-lg ${isMenuFolded ? 'ms-1' : 'me-2'}`;
  const menuLinkStyles = `text-xs font-normal md:text-sm ${
    isMenuFolded ? 'hidden' : 'block'
  }`;
  const foldedAccessibleName = isMenuFolded ? link.title : undefined;

  if (link.workspaceOnly && !hasWorkspace) return null;

  if (link.href) {
    return (
      <li>
        <Link
          className={`
            flex min-h-11 items-center justify-between rounded-[2px] p-3
            text-start
            hover:bg-muted
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-accent
            ${link.active ? 'bg-muted text-foreground' : ''}
            overflow-hidden transition-[width,background-color]
            ${isMenuFolded ? 'w-12' : 'w-full'}
          `}
          href={link.href}
          onClick={() => setIsMenuOpen(false)}
          {...(link.props as ComponentPropsWithoutRef<'a'>)}
          aria-current={link.active ? 'page' : undefined}
          aria-label={
            (link.props as ComponentPropsWithoutRef<'a'> | undefined)?.[
              'aria-label'
            ] ?? foldedAccessibleName
          }
        >
          <div className={`flex w-full min-w-36 items-center justify-start`}>
            <div className={menuIconStyles} aria-hidden='true'>
              {link.icon}
            </div>
            <p className={menuLinkStyles}>{link.title}</p>
          </div>
        </Link>
      </li>
    );
  } else {
    return (
      <li>
        <button
          type='button'
          className={`
            flex min-h-11 items-center justify-between rounded-[2px] p-3
            text-start
            hover:bg-muted
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-accent
            ${link.active ? 'bg-muted text-foreground' : ''}
            overflow-hidden transition-[width,background-color]
            ${isMenuFolded ? 'w-12' : 'w-full'}
          `}
          onClick={() => {
            setIsMenuOpen(false);
            if (link.action) link.action();
          }}
          {...(link.props as ComponentPropsWithoutRef<'button'>)}
          aria-label={
            (link.props as ComponentPropsWithoutRef<'button'> | undefined)?.[
              'aria-label'
            ] ?? foldedAccessibleName
          }
        >
          <div className={`flex w-full min-w-36 items-center justify-start`}>
            <div className={menuIconStyles} aria-hidden='true'>
              {link.icon}
            </div>
            <p className={menuLinkStyles}>{link.title}</p>
          </div>
        </button>
      </li>
    );
  }
}
