'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MdOutlineEmail } from 'react-icons/md';

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
  <div className='min-w-28 text-left' id={linkKey}>
    <h3 className='mb-4 text-lg font-medium text-white text-opacity-80'>
      {section.title}
    </h3>
    <ul>
      {section.links.map((link, idx) => (
        <li className='mb-2' key={`${linkKey}-footer-link-${idx}`}>
          <Link
            className='inline-block text-sm font-light text-white text-opacity-40 transition-colors duration-200 hover:text-irmin_green'
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
      <div className='container mx-auto max-w-7xl px-2 md:px-4 xl:px-0'>
        <div className='flex flex-wrap justify-between gap-y-12 py-6 md:flex-row md:items-start md:justify-start md:pt-12 xl:pt-24'>
          <div className='min-w-72 sm:w-[40%] md:w-1/4 md:pl-2 xl:w-1/6'>
            <div className='flex flex-col items-start'>
              <Link className='mb-8 inline-block' href='#'>
                <Image
                  className='h-6 min-h-4 w-auto'
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={100}
                  height={100}
                />
              </Link>
              <p className='mb-8 w-full max-w-64 text-left text-xs font-light text-white text-opacity-40'>
                {dict.website.footer.description}
              </p>
              <div className='max-w-[110px]'>
                <LanguageSwitcher
                  className={`my-4 -ml-1 block w-full overflow-hidden text-nowrap rounded-lg border-r-4 border-[#051f2a] bg-[#051f2a] py-2 pl-4 pr-3 text-sm font-light text-irmin_green transition-all focus:outline-none lg:text-sm xl:text-base`}
                />
              </div>
            </div>
          </div>
          <div className='order-3 min-w-72 sm:w-full md:order-2 md:w-fit md:max-w-[50%] xl:max-w-[62%]'>
            <div className='flex flex-wrap gap-4'>
              {sections.map((section, idx) => (
                <FooterLinkSection
                  key={`website-footer-link-section-${idx}`}
                  linkKey={`website-footer-link-section-${idx}`}
                  section={section}
                />
              ))}
            </div>
          </div>
          <div className='order-2 min-w-72 overflow-hidden sm:w-[40%] md:order-3 md:ml-auto md:w-1/4 md:pr-2 xl:w-1/6'>
            <div className='flex flex-col items-start'>
              <div className='max-w-56'>
                <h3 className='mb-3 text-left text-lg font-medium text-white text-opacity-80'>
                  {dict.website.footer.newsletter.title}
                </h3>
                <p className='mb-5 text-left text-xs text-white text-opacity-40'>
                  {dict.website.footer.newsletter.subtitle}
                </p>
              </div>
              <div className='flex w-full max-w-sm flex-row justify-stretch gap-0 align-middle md:mx-0'>
                <Input
                  size='sm'
                  colorScheme='secondary'
                  variant='solid'
                  placeholder={dict.website.footer.newsletter.email}
                  type='email'
                  className='h-12 w-full rounded-r-none border-0 bg-[#051f2a] text-gray-200 shadow-none placeholder:text-gray-700'
                />
                <Button
                  size='sm'
                  className='h-12 min-w-max rounded-l-none border-0 bg-[#051f2a] px-6 text-white text-opacity-60 shadow-none hover:bg-[#172a32] hover:text-white'
                  colorScheme='secondary'
                  variant='solid'
                  icon={<MdOutlineEmail size={16} />}
                >
                  {dict.website.footer.newsletter.subscribe}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className='mt-8 flex w-full flex-col items-start gap-4 py-2 sm:flex-row sm:items-center sm:justify-end'>
          <div className='flex flex-row items-center gap-4'>
            <Link
              className='inline-block text-xs font-light text-white text-opacity-40 transition-all duration-200 hover:underline'
              href='/legal/privacy-policy'
            >
              {dict.website.footer.privacy}
            </Link>
            <Link
              className='inline-block text-xs font-light text-white text-opacity-40 transition-all duration-200 hover:underline'
              href='/legal/terms-of-use'
            >
              {dict.website.footer.terms}
            </Link>
          </div>
          <p className='text-xs font-light text-white text-opacity-40'>
            &copy; {new Date().getFullYear()} Irmin.{' '}
            {dict.website.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </section>
  );
}
