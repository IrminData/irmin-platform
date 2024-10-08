'use client';

import Image from 'next/image';
import Link from 'next/link';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

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
 * @todo Newsletter subscription is not implemented yet.
 */
export default function WebsiteNewsletterSection({
  section,
}: {
  section: NewsletterSection;
}) {
  const { dict } = useLocale();
  return (
    <WebsiteSectionWrapper id='website-newsletter-section'>
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
          <h3 className='mb-4 text-3xl font-bold leading-tight tracking-tighter text-foreground md:text-4xl'>
            {section.title}
          </h3>
          <p className='mb-8 text-sm font-normal text-foreground md:text-base'>
            {section.subtitle}
          </p>
          <div className='mx-auto text-left md:max-w-md'>
            <div className='mb-1 flex flex-wrap gap-2'>
              <div className='w-full md:flex-1'>
                <Input
                  placeholder={dict.website.sections.newsletter.email}
                  type='email'
                />
              </div>
              <Button variant='default' className='w-full md:w-auto'>
                {dict.website.sections.newsletter.subscribe}
              </Button>
            </div>
            <span className='text-xs font-normal text-foreground'>
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
    </WebsiteSectionWrapper>
  );
}
