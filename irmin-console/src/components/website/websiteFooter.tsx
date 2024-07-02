'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

interface FooterLink {
  href: string;
  label: string;
}
interface FooterLinkSection {
  title: string;
  links: FooterLink[];
}

const footerLinks: FooterLinkSection[] = [
  {
    title: 'Product',
    links: [
      { href: '#', label: 'Features' },
      { href: '#', label: 'Solutions' },
      { href: '#', label: 'Pricing' },
      { href: '#', label: 'Tutorials' },
      { href: '#', label: 'Updates' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#', label: 'Blog' },
      { href: '#', label: 'Newsletter' },
      { href: '#', label: 'Help Centre' },
      { href: '#', label: 'Careers' },
      { href: '#', label: 'Support' },
    ],
  },
];

const FooterLinkSection = ({
  section,
  linkKey,
}: {
  section: FooterLinkSection;
  linkKey: string;
}) => (
  <div className='w-full sm:w-1/4 md:w-1/2 lg:w-1/3 xl:w-1/4' id={linkKey}>
    <h3 className='mb-5 text-lg font-bold text-white'>{section.title}</h3>
    <ul>
      {section.links.map((link, idx) => (
        <li className='mb-4' key={`${linkKey}-footer-link-${idx}`}>
          <Link
            className='inline-block text-base font-light text-irmin_green transition-colors duration-200 hover:text-white hover:underline'
            href={link.href}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default function WebsiteFooter() {
  return (
    <>
      <section className='bg-irmin_black'>
        <div className='container mx-auto max-w-7xl text-center md:text-left'>
          <div className='flex flex-col justify-start gap-8 px-2 py-8 text-sm md:flex-row md:justify-between md:gap-3 md:py-24 lg:text-base'>
            <div className='justify-start'>
              <Link className='mb-4 inline-block' href='#'>
                <Image
                  className='h-8'
                  src='/irmin-logo-light.svg'
                  alt='Irmin light color logo'
                  width={100}
                  height={25}
                />
              </Link>
              <p className='mx-auto w-full max-w-64 text-center font-light text-irmin_green md:mx-0 md:text-left'>
                A better home for your data. Irmin is an ETL and data management
                platform that helps you to collect, clean, and transform your
                data.
              </p>
            </div>
            <div className='flex flex-1 flex-wrap items-center justify-center gap-8'>
              {footerLinks.map((section, idx) => (
                <FooterLinkSection
                  key={`website-footer-link-section-${idx}`}
                  linkKey={`website-footer-link-section-${idx}`}
                  section={section}
                />
              ))}
            </div>
            <div className='justify-end'>
              <h3 className='mb-5 text-lg font-bold text-white'>Newsletter</h3>
              <div className='mx-auto flex max-w-sm flex-row justify-stretch gap-1 align-middle md:mx-0'>
                <Input
                  size='sm'
                  colorScheme='primary'
                  variant='solid'
                  placeholder='Your email'
                  type='email'
                  className='h-12 w-full min-w-64'
                />
                <Button
                  size='sm'
                  className='inline-block h-12 w-full justify-end'
                  colorScheme='primary'
                  variant='solid'
                >
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
          <div className='flex flex-row items-center justify-center gap-4 py-2'>
            <Link
              className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
              href='/legal/privacy-policy'
            >
              Privacy Policy
            </Link>
            <Link
              className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
              href='/legal/terms-of-use'
            >
              Terms of Use
            </Link>
          </div>
          <p className='py-2 text-center text-sm font-light text-irmin_green'>
            &copy; {new Date().getFullYear()} Irmin. All rights reserved.
          </p>
        </div>
      </section>
    </>
  );
}
