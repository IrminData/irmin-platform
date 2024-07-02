'use client';

import React, { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

import Button from '@/components/misc/Button';

import { useProfile } from '@/context/ProfileContext';

interface WebsiteNavLink {
  href: string;
  label: string;
  subpages: { href: string; label: string }[];
}
const navLinks: WebsiteNavLink[] = [
  {
    href: '/product',
    label: 'Product',
    subpages: [
      { href: '#', label: 'Overview 🖥️' },
      { href: '#', label: 'Features 🦅' },
      { href: '#', label: 'Security 👮🏻‍♂️' },
      { href: '#', label: 'Data Warehouse 💿' },
    ],
  },
  {
    href: '#',
    label: 'Marketplace',
    subpages: [
      { href: '#', label: 'Connectors 📦' },
      { href: '#', label: 'Plugins 🧩' },
      { href: '#', label: 'Integrations 🤝' },
    ],
  },
  {
    href: '#',
    label: 'Developers',
    subpages: [
      { href: '#', label: 'Getting Started 🧑‍💻' },
      { href: '#', label: 'Creating connectors ♻️' },
      { href: '#', label: 'Creating plugins 🔌' },
      { href: '#', label: 'API Reference 📚' },
      { href: '#', label: 'FAQ 🙋🏽‍♀️' },
    ],
  },
  { href: '/pricing', label: 'Pricing', subpages: [] },
  {
    href: '/team',
    label: 'Team',
    subpages: [{ href: '#', label: 'Join our team 😎' }],
  },
  { href: '/blog', label: 'Blog', subpages: [] },
  { href: '/contact', label: 'Contact us', subpages: [] },
];

const NavLink = ({
  link,
  linkKey,
}: {
  link: WebsiteNavLink;
  linkKey: string;
}) => {
  const pathname = usePathname();
  const isActive = link.href !== '#' && pathname === link.href;
  return (
    <li className='group relative' id={linkKey}>
      <Link
        className={`block h-full overflow-hidden text-nowrap rounded px-1 py-3 text-xs font-light transition-all hover:bg-gray-200 lg:text-sm xl:px-3 xl:text-base ${isActive ? 'text-ash_gray underline' : 'text-irmin_black'}`}
        aria-label={link.label}
        href={link.href}
      >
        {link.label}
      </Link>
      {link.subpages.length > 0 && (
        <ul className='absolute left-0 mt-0 hidden w-44 overflow-hidden rounded bg-white py-4 shadow group-hover:block'>
          {link.subpages.map((subpage, idx) => (
            <li
              key={`website-desktop-navigation-link-sublink-${idx}-${linkKey}`}
            >
              <Link
                className={`block overflow-hidden text-nowrap rounded px-2 py-2 text-sm font-light transition-all hover:bg-gray-200 ${isActive ? 'text-ash_gray underline' : 'text-irmin_black'}`}
                aria-label={subpage.label}
                href={subpage.href}
              >
                {subpage.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const MobileNavLink = ({
  link,
  linkKey,
  closeMenu,
}: {
  link: WebsiteNavLink;
  linkKey: string;
  closeMenu: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = link.href !== '#' && pathname === link.href;

  return (
    <li className='relative' id={linkKey}>
      <div
        className={`block w-full ${!isOpen && 'border-b'} text-nowrap rounded px-4 py-2 text-base font-light ${isActive ? 'text-ash_gray' : 'text-irmin_black'} flex items-center justify-between`}
        aria-label={link.label}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Link href={link.href} onClick={closeMenu}>
          {link.label}
        </Link>
        {link.subpages.length > 0 && (
          <span>{isOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
        )}
      </div>
      {isOpen && link.subpages.length > 0 && (
        <ul className='border-b pb-4 pl-4'>
          {link.subpages.map((subpage, idx) => (
            <li
              key={`website-mobile-navigation-link-sublink-${idx}-${linkKey}`}
            >
              <Link
                className='block text-nowrap rounded px-2 py-2 text-base font-light text-irmin_black transition-all hover:bg-gray-200'
                aria-label={subpage.label}
                href={subpage.href}
                onClick={closeMenu}
              >
                {subpage.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default function WebsiteNavigation() {
  const profile = useProfile();
  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const [animate, setAnimate] = React.useState('');

  const closeMenu = () => {
    setAnimate('animate-slideOut');
    setTimeout(() => {
      setNavbarOpen(false);
      setAnimate('');
    }, 200);
  };

  useEffect(() => {
    if (navbarOpen) {
      setAnimate('animate-slideIn');
    }
  }, [navbarOpen]);

  return (
    <>
      <div className='fixed z-50 w-full bg-white shadow'>
        <div className='container mx-auto max-w-7xl px-2 py-4'>
          <nav className='flex justify-between'>
            <div className='flex w-full items-center justify-between gap-2'>
              <div className='flex w-full items-center justify-start gap-6'>
                <Link href='/'>
                  <Image
                    className='h-6 min-h-4 xl:h-12'
                    src='/irmin-logo.svg'
                    alt='Irmin logo'
                    width={120}
                    height={120}
                  />
                </Link>
                <ul className='hidden gap-1.5 md:flex md:justify-center xl:gap-3'>
                  {navLinks.map((link, idx) => (
                    <NavLink
                      key={`website-desktop-navigation-link-${idx}`}
                      linkKey={`website-desktop-navigation-link-${idx}`}
                      link={link}
                    />
                  ))}
                </ul>
              </div>
              <div className='hidden flex-row items-center justify-end gap-1 md:flex'>
                {!profile.isLoading &&
                  (profile.profile ? (
                    <>
                      <div className='flex w-24 flex-col gap-1 align-middle lg:w-36 lg:flex-row lg:gap-2'>
                        <Link
                          href='/app/profile'
                          className='align-center my-auto justify-center'
                        >
                          <Image
                            src='/ui-assets/elements/avatar.webp'
                            alt={profile.profile.name ?? ''}
                            width={50}
                            height={50}
                            className='h-6 w-auto rounded-full xl:h-8'
                          />
                        </Link>
                        <Link
                          href='/app/profile'
                          className='align-center flex flex-col justify-center'
                        >
                          <h2 className='text-xs font-normal text-irmin_black lg:text-sm lg:font-semibold'>
                            {profile.profile.name ?? ''}
                          </h2>
                          <p className='text-xs font-light text-irmin_black lg:text-sm'>
                            {profile.profile.email ?? ''}
                          </p>
                        </Link>
                      </div>
                      <Button
                        size='sm'
                        variant='solid'
                        colorScheme='secondary'
                        className='w-32 lg:w-36'
                        ariaLabel='Go to Irmin app'
                        href='/app'
                      >
                        Go to app
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size='sm'
                        variant='link'
                        colorScheme='secondary'
                        className='w-16 md:w-24'
                        ariaLabel='Sign In with your Irmin account'
                        href='/sign-in'
                        onClick={closeMenu}
                      >
                        Sign In
                      </Button>
                      <Button
                        size='sm'
                        variant='solid'
                        colorScheme='secondary'
                        className='w-16 md:w-24'
                        ariaLabel='Create a new Irmin account'
                        href='/sign-up'
                        onClick={closeMenu}
                      >
                        Sign Up
                      </Button>
                    </>
                  ))}
              </div>
            </div>
            <button
              className='navbar-burger self-center md:hidden'
              onClick={() => {
                setNavbarOpen(!navbarOpen);
              }}
            >
              <svg
                width={35}
                height={35}
                viewBox='0 0 32 32'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  className='text-irmin_black'
                  d='M7 12H25C25.2652 12 25.5196 11.8946 25.7071 11.7071C25.8946 11.5196 26 11.2652 26 11C26 10.7348 25.8946 10.4804 25.7071 10.2929C25.5196 10.1054 25.2652 10 25 10H7C6.73478 10 6.48043 10.1054 6.29289 10.2929C6.10536 10.4804 6 10.7348 6 11C6 11.2652 6.10536 11.5196 6.29289 11.7071C6.48043 11.8946 6.73478 12 7 12ZM25 15H7C6.73478 15 6.48043 15.1054 6.29289 15.2929C6.10536 15.4804 6 15.7348 6 16C6 16.2652 6.10536 16.5196 6.29289 16.7071C6.48043 16.8946 6.73478 17 7 17H25C25.2652 17 25.5196 16.8946 25.7071 16.7071C25.8946 16.5196 26 16.2652 26 16C26 15.7348 25.8946 15.4804 25.7071 15.2929C25.5196 15.1054 25.2652 15 25 15ZM25 20H7C6.73478 20 6.48043 20.1054 6.29289 20.2929C6.10536 20.4804 6 20.7348 6 21C6 21.2652 6.10536 21.5196 6.29289 21.7071C6.48043 21.8946 6.73478 22 7 22H25C25.2652 22 25.5196 21.8946 25.7071 21.7071C25.8946 21.5196 26 21.2652 26 21C26 20.7348 25.8946 20.4804 25.7071 20.2929C25.5196 20.1054 25.2652 20 25 20Z'
                  fill='currentColor'
                />
              </svg>
            </button>
          </nav>
        </div>
      </div>
      <div className='h-[80px]'></div>

      {navbarOpen && (
        <div className='bg-transparent'>
          <div
            className={`navbar-menu fixed right-0 top-0 z-50 h-full w-full bg-irmin_black bg-opacity-50`}
          >
            <div
              className={`fixed bottom-0 right-0 top-0 w-full max-w-xs bg-white ${animate}`}
            >
              <nav className='relative h-full overflow-y-auto px-4 py-20'>
                <div className='flex h-full flex-col justify-start'>
                  <Link className='inline-block' href='/'>
                    <Image
                      className='mx-auto h-8'
                      src='/irmin-logo.svg'
                      alt='Irmin logo'
                      width={150}
                      height={50}
                    />
                  </Link>
                  {!profile.isLoading && profile.profile && (
                    <div className='mt-6 flex w-full flex-row justify-center gap-2 align-middle'>
                      <Link
                        href='/app/profile'
                        className='align-center my-auto justify-center'
                      >
                        <Image
                          src='/ui-assets/elements/avatar.webp'
                          alt={profile.profile.name ?? ''}
                          width={50}
                          height={50}
                          className='h-8 w-auto rounded-full'
                        />
                      </Link>
                      <Link
                        href='/app/profile'
                        className='align-center flex flex-col justify-center'
                      >
                        <h2 className='text-xs font-normal text-irmin_black lg:text-sm lg:font-semibold'>
                          {profile.profile.name ?? ''}
                        </h2>
                        <p className='text-xs font-light text-irmin_black lg:text-sm'>
                          {profile.profile.email ?? ''}
                        </p>
                      </Link>
                    </div>
                  )}
                  <ul className='mt-6 flex flex-col gap-2'>
                    {navLinks.map((link, idx) => (
                      <MobileNavLink
                        key={`website-mobile-navigation-link-${idx}`}
                        linkKey={`website-desktop-navigation-link-${idx}`}
                        link={link}
                        closeMenu={closeMenu}
                      />
                    ))}
                  </ul>
                  <div className='flex-grow'></div>
                  <div className='pb-20 pt-4'>
                    {!profile.isLoading &&
                      (profile.profile ? (
                        <Button
                          href='/app'
                          colorScheme='primary'
                          size='lg'
                          variant='outline'
                          className='w-full'
                          onClick={closeMenu}
                          ariaLabel='Go to Irmin app'
                        >
                          Go to app
                        </Button>
                      ) : (
                        <div className='flex w-full flex-wrap items-center justify-stretch gap-2'>
                          <Button
                            size='lg'
                            variant='link'
                            colorScheme='secondary'
                            className='inline-block'
                            href='/sign-in'
                            onClick={closeMenu}
                            ariaLabel='Sign In with your Irmin account'
                          >
                            Sign In
                          </Button>
                          <Button
                            size='lg'
                            variant='solid'
                            colorScheme='secondary'
                            className='inline-block'
                            href='/sign-up'
                            onClick={closeMenu}
                            ariaLabel='Create a new Irmin account'
                          >
                            Sign Up
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </nav>
              <button
                onClick={closeMenu}
                className='navbar-close absolute right-3 top-5 p-4'
              >
                <svg
                  width={14}
                  height={14}
                  viewBox='0 0 12 12'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M6.94004 6L11.14 1.80667C11.2656 1.68113 11.3361 1.51087 11.3361 1.33333C11.3361 1.1558 11.2656 0.985537 11.14 0.860002C11.0145 0.734466 10.8442 0.66394 10.6667 0.66394C10.4892 0.66394 10.3189 0.734466 10.1934 0.860002L6.00004 5.06L1.80671 0.860002C1.68117 0.734466 1.51091 0.663941 1.33337 0.663941C1.15584 0.663941 0.985576 0.734466 0.860041 0.860002C0.734505 0.985537 0.66398 1.1558 0.66398 1.33333C0.66398 1.51087 0.734505 1.68113 0.860041 1.80667L5.06004 6L0.860041 10.1933C0.797555 10.2553 0.747959 10.329 0.714113 10.4103C0.680267 10.4915 0.662842 10.5787 0.662842 10.6667C0.662842 10.7547 0.680267 10.8418 0.714113 10.9231C0.747959 11.0043 0.797555 11.078 0.860041 11.14C0.922016 11.2025 0.99575 11.2521 1.07699 11.2859C1.15823 11.3198 1.24537 11.3372 1.33337 11.3372C1.42138 11.3372 1.50852 11.3198 1.58976 11.2859C1.671 11.2521 1.74473 11.2025 1.80671 11.14L6.00004 6.94L10.1934 11.14C10.2554 11.2025 10.3291 11.2521 10.4103 11.2859C10.4916 11.3198 10.5787 11.3372 10.6667 11.3372C10.7547 11.3372 10.8419 11.3198 10.9231 11.2859C11.0043 11.2521 11.0781 11.2025 11.14 11.14C11.2025 11.078 11.2521 11.0043 11.286 10.9231C11.3198 10.8418 11.3372 10.7547 11.3372 10.6667C11.3372 10.5787 11.3198 10.4915 11.286 10.4103C11.2521 10.329 11.2025 10.2553 11.14 10.1933L6.94004 6Z'
                    fill='#556987'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
