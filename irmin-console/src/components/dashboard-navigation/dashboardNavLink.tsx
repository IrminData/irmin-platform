import { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

import { DashboardNavLinkType } from '@/components/dashboard-navigation/dashboardNavLinks';

export default function DashboardNavLink({
  link,
  isMenuFolded,
  setIsMenuOpen,
}: {
  link: DashboardNavLinkType;
  isMenuFolded: boolean;
  setIsMenuOpen: (_value: boolean) => void;
}) {
  const menuIconStyles = `text-base lg:text-xl ${isMenuFolded ? '' : 'mr-2'}`;
  const menuLinkStyles = `text-xs font-light md:text-sm xl:text-base ${
    isMenuFolded ? 'hidden' : 'block'
  }`;

  if (link.href) {
    return (
      <li>
        <Link
          className={`flex items-center justify-between rounded-md p-3 py-4 text-irmin_green hover:text-irmin_green-300 ${
            link.active ? 'bg-gray-700' : ''
          }`}
          href={link.href}
          onClick={() => setIsMenuOpen(false)}
          aria-label={link.title}
          {...(link.props as ComponentPropsWithoutRef<'a'>)}
        >
          <div
            className={`flex w-full items-center ${!isMenuFolded ? 'justify-start' : 'justify-between'}`}
          >
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
          className={`flex items-center justify-between rounded-md p-3 py-4 text-irmin_green hover:text-irmin_green-300 ${
            link.active ? 'bg-gray-700' : ''
          }`}
          onClick={() => {
            setIsMenuOpen(false);
            if (link.action) link.action();
          }}
          aria-label={link.title}
          {...(link.props as ComponentPropsWithoutRef<'button'>)}
        >
          <div
            className={`flex w-full items-center ${!isMenuFolded ? 'justify-start' : 'justify-between'}`}
          >
            <div className={menuIconStyles}>{link.icon}</div>
            <p className={menuLinkStyles}>{link.title}</p>
          </div>
        </button>
      </li>
    );
  }
}
