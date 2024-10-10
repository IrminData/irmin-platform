import Button from '@/components/ui/button';
import DynamicFaIcon from '@/components/ui/DynamicFaIcon';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { getURL } from '@/utils/wordpress';

import { CTADarkSection } from '@/types/website/Wordpress';

/**
 * Website CTA dark section
 *
 * @remarks
 *
 * This component is used to display a call-to-action section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, description, and buttons.
 * The buttons are displayed as a list of links with text and colors.
 */
export default function WebsiteCTADarkSection({
  section,
}: {
  section: CTADarkSection;
}) {
  return (
    <WebsiteSectionWrapper id='cta-dark-section'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='relative -mb-40 overflow-hidden rounded-xl bg-irmin_black px-4 py-16 dark:bg-gray-600 md:px-8 lg:px-16'>
          <div className='relative mx-auto max-w-2xl text-center'>
            <h3 className='mb-2 text-2xl font-bold leading-tight tracking-tighter text-irmin_green md:text-5xl'>
              {section.title}
            </h3>
            <p className='mb-6 text-sm font-normal text-gray-100 md:text-base'>
              {section.description}
            </p>
            <div className='flex flex-wrap gap-4'>
              {section.buttons.map((button, index) => (
                <Button
                  key={`cta-dark-button-${index}`}
                  variant={button.variant}
                  className='mb-2 flex-grow'
                  aria-label={button.text}
                  href={getURL(button.link)}
                  icon={
                    button.icon ? (
                      <DynamicFaIcon name={button.icon} />
                    ) : undefined
                  }
                >
                  {button.text}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className='bg-irmin_black-50 h-64' />
    </WebsiteSectionWrapper>
  );
}
