'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MdOutlineEmail } from 'react-icons/md';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

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
            className='inline-block text-sm font-normal text-white text-opacity-60 transition-colors duration-200 hover:text-irmin_green'
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
    <section className='mt-12 bg-irmin_black dark:bg-black'>
      <div className='container mx-auto max-w-96 px-0 md:max-w-7xl md:px-4 xl:px-0'>
        <div className='flex flex-wrap justify-center gap-y-12 py-6 md:flex-row md:items-start md:justify-start md:pt-12 xl:pt-24'>
          {/* Logo, description and language switcher */}
          <div className='order-1 min-w-96 sm:w-[40%] md:w-1/4 md:pl-2 xl:w-1/6 xl:min-w-96'>
            <div className='flex flex-col items-start'>
              <div className='mb-8 inline-block'>
                <Image
                  className='h-6 min-h-4 w-auto'
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={100}
                  height={100}
                />
              </div>
              <p className='mb-8 w-full max-w-64 text-left text-xs text-white text-opacity-60'>
                {dict.website.footer.description}
              </p>
              <div className='dark w-full max-w-40'>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
          {/* Footer links */}
          <div className='order-2 min-w-96 sm:w-full md:w-fit md:max-w-[50%] xl:min-w-96 xl:max-w-[62%]'>
            <div className='flex flex-wrap justify-between gap-4 sm:justify-center'>
              {sections.map((section, idx) => (
                <FooterLinkSection
                  key={`website-footer-link-section-${idx}`}
                  linkKey={`website-footer-link-section-${idx}`}
                  section={section}
                />
              ))}
            </div>
          </div>
          {/* Newsletter subscription form */}
          <div className='order-3 min-w-96 overflow-hidden sm:w-[40%] md:ml-auto md:w-1/4 md:pr-2 lg:order-3 xl:w-1/6 xl:min-w-96'>
            <div className='flex flex-col items-start'>
              <div className='max-w-64'>
                <h3 className='mb-3 text-left text-lg font-medium text-white text-opacity-80'>
                  {dict.website.footer.newsletter.title}
                </h3>
                <p className='mb-5 text-left text-xs text-white text-opacity-60'>
                  {dict.website.footer.newsletter.subtitle}
                </p>
              </div>
              <div className='flex w-full flex-row justify-stretch gap-0 align-middle md:mx-0'>
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
        <div className='mt-8 flex w-full flex-col items-center gap-4 py-2 md:pr-2 lg:items-end'>
          <div className='flex flex-row items-center gap-4'>
            <Link
              className='inline-block text-xs font-normal text-white text-opacity-60 transition-all duration-200 hover:underline'
              href='/legal/privacy-policy'
            >
              {dict.website.footer.privacy}
            </Link>
            <Link
              className='inline-block text-xs font-normal text-white text-opacity-60 transition-all duration-200 hover:underline'
              href='/legal/terms-of-use'
            >
              {dict.website.footer.terms}
            </Link>
          </div>
          <p className='text-xs font-normal text-white text-opacity-60'>
            &copy; {new Date().getFullYear()} Irmin.{' '}
            {dict.website.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </section>
  );
}
