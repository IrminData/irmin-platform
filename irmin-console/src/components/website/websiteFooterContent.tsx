'use client';

import Image from 'next/image';
import Link from 'next/link';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

import { WebsiteFooterLinkSection } from '@/types/website/WebsiteNavigation';

/**
 * Website footer content
 *
 * @remarks
 *
 * This component is used to display the footer content on the website.
 * It displays the footer links, newsletter subscription form, and legal information.
 *
 * It is used by the WebsiteFooter component.
 */
const FooterLinkSection = ({
  section,
  linkKey,
}: {
  section: WebsiteFooterLinkSection;
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

export default function WebsiteFooterContent({
  footerLinks,
}: {
  footerLinks: {
    [key: string]: WebsiteFooterLinkSection[];
  };
}) {
  const { dict, locale } = useLocale();
  const sections = footerLinks[locale] ?? [];

  return (
    <section className='mt-12 bg-irmin_black'>
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
            <p className='mx-auto mb-4 w-full max-w-64 text-center font-light text-irmin_green md:mx-0 md:text-left'>
              {dict.website.footer.description}
            </p>
            <div className='mx-auto max-w-[110px] md:mx-0'>
              <LanguageSwitcher
                className={`my-4 -ml-1 block w-full overflow-hidden text-nowrap rounded bg-transparent p-0 text-xs font-light text-irmin_green transition-all lg:text-sm xl:text-base`}
              />
            </div>
            <div className='hidden flex-row items-center justify-start gap-4 py-4 lg:flex'>
              <Link
                className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
                href='/legal/privacy-policy'
              >
                {dict.website.footer.privacy}
              </Link>
              <Link
                className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
                href='/legal/terms-of-use'
              >
                {dict.website.footer.terms}
              </Link>
            </div>
          </div>
          <div className='flex flex-1 flex-wrap items-start justify-center gap-8'>
            {sections.map((section, idx) => (
              <FooterLinkSection
                key={`website-footer-link-section-${idx}`}
                linkKey={`website-footer-link-section-${idx}`}
                section={section}
              />
            ))}
          </div>
          <div className='flex flex-col items-center lg:items-start'>
            <h3 className='mb-3 text-center text-lg font-bold text-white lg:text-left'>
              {dict.website.footer.newsletter.title}
            </h3>
            <p className='mb-5 max-w-sm text-center text-irmin_green lg:text-left'>
              {dict.website.footer.newsletter.subtitle}
            </p>
            <div className='mx-auto flex w-full max-w-sm flex-row justify-stretch gap-1 align-middle md:mx-0'>
              <Input
                size='sm'
                colorScheme='primary'
                variant='solid'
                placeholder={dict.website.footer.newsletter.email}
                type='email'
                className='h-12 w-full min-w-64'
              />
              <Button
                size='sm'
                className='inline-block h-12 w-full min-w-16 justify-end'
                colorScheme='primary'
                variant='solid'
              >
                {dict.website.footer.newsletter.subscribe}
              </Button>
            </div>
          </div>
        </div>
        <div className='flex flex-row items-center justify-center gap-4 py-2 lg:hidden'>
          <Link
            className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
            href='/legal/privacy-policy'
          >
            {dict.website.footer.privacy}
          </Link>
          <Link
            className='inline-block text-xs font-light text-irmin_green transition-colors duration-200 hover:underline'
            href='/legal/terms-of-use'
          >
            {dict.website.footer.terms}
          </Link>
        </div>
        <p className='py-2 text-center text-sm font-light text-irmin_green'>
          &copy; {new Date().getFullYear()} Irmin.{' '}
          {dict.website.footer.allRightsReserved}
        </p>
      </div>
    </section>
  );
}
