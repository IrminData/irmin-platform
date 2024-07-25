'use client';

import Image from 'next/image';
import Link from 'next/link';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

import { NewsletterSection } from '@/types/website/Wordpress';

/**
 * Website newsletter section
 *
 * @remarks
 *
 * This component is used to display the newsletter section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the newsletter subscription form with an email input and a subscribe button.
 * The form also includes a privacy notice with a link to the privacy policy.
 *
 * The newsletter section is used to collect email addresses for the newsletter subscription.
 * TODO: Newsletter subscription is not implemented yet.
 */
export default function WebsiteNewsletterSection({
  section,
}: {
  section: NewsletterSection;
}) {
  const { dict } = useLocale();
  return (
    <section
      id='newsletter-section'
      className='relative bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <Image
        className='absolute left-6 top-6 w-24 md:w-auto'
        src='/ui-assets/elements/dots3-violet.svg'
        alt='violet dots'
        width={149}
        height={91}
      />
      <Image
        className='absolute bottom-6 right-6 w-24 md:w-auto'
        src='/ui-assets/elements/dots3-blue.svg'
        alt='blue dots'
        width={149}
        height={91}
      />
      <div className='container relative z-10 mx-auto px-4'>
        <div className='mx-auto max-w-xl text-center'>
          <h3 className='mb-4 text-3xl font-bold leading-tight tracking-tighter text-irmin_black md:text-4xl'>
            {section.title}
          </h3>
          <p className='mb-8 text-sm font-light text-irmin_black md:text-base'>
            {section.subtitle}
          </p>
          <div className='mx-auto text-left md:max-w-md'>
            <div className='mb-1 flex flex-wrap gap-2'>
              <div className='w-full md:flex-1'>
                <Input
                  size='md'
                  colorScheme='primary'
                  variant='outline'
                  placeholder={dict.website.sections.newsletter.email}
                  type='email'
                  className='w-full'
                />
              </div>
              <Button
                size='md'
                variant='solid'
                colorScheme='primary'
                className='w-full md:w-auto'
              >
                {dict.website.sections.newsletter.subscribe}
              </Button>
            </div>
            <span className='text-xs font-light text-irmin_black'>
              <span> {dict.website.sections.newsletter.privacy_notice} </span>
              <Link
                className='text-irmin_green-500 hover:text-irmin_green-600'
                href='/legal/privacy-policy'
              >
                {dict.website.sections.newsletter.privacy}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
