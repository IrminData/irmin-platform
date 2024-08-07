import Image from 'next/image';

import WordPress from '@/services/wordpress';

import Button from '@/components/common/button/Button';
import DynamicFaIcon from '@/components/common/DynamicFaIcon';

import { getURL } from '@/utils/wordpress';

import { CTASection } from '@/types/website/Wordpress';

/**
 * Website CTA section
 *
 * @remarks
 *
 * This component is used to display a call-to-action section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, bullet points, and buttons.
 * The buttons are displayed as a list of links with text and colors.
 */
export default async function WebsiteCTASection({
  section,
}: {
  section: CTASection;
}) {
  const wordpress = WordPress.getInstance();

  const image =
    typeof section.image === 'number'
      ? await wordpress
          .getMediaByID(section.image)
          .then((media) => media?.source_url)
      : section.image;

  return (
    <section
      id='cta-section'
      className='overflow-hidden bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='-mx-4 flex flex-wrap'>
          <div className='mb-20 w-full px-4 md:w-1/2 lg:mb-0'>
            <div className='max-w-lg'>
              <h2 className='font-heading md:leading-15 mb-8 text-4xl font-bold text-irmin_black md:text-5xl'>
                {section.title}
              </h2>
              <ul className='mb-8'>
                {section.bullet_points.map((bullet, index) => (
                  <li
                    className='mb-4 flex items-center'
                    key={`bullet-point-${index}`}
                  >
                    <Image
                      className='mr-3'
                      src='/ui-assets/elements/checkbox-green.svg'
                      alt='Green checkbox'
                      width={26}
                      height={26}
                    />
                    <span className='font-heading text-lg text-irmin_black md:text-xl'>
                      {bullet.title}
                    </span>
                  </li>
                ))}
              </ul>
              <div className='flex w-full flex-row items-center gap-2'>
                {section.buttons.map((button, index) => (
                  <div className='w-1/2' key={`button-${index}`}>
                    <Button
                      size='lg'
                      variant={button.variant}
                      colorScheme={button.color_scheme}
                      className={`w-full`}
                      ariaLabel={button.text}
                      href={getURL(button.link)}
                      icon={
                        button.icon ? (
                          <DynamicFaIcon name={button.icon} />
                        ) : undefined
                      }
                    >
                      {button.text}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='w-full px-4 md:w-1/2'>
            <div className='relative mx-auto max-w-max'>
              <Image
                className='absolute right-0 top-0 z-10 -mr-6 -mt-6 w-20 lg:-mr-12 lg:-mt-12 lg:w-auto'
                src='/ui-assets/elements/circle3-yellow.svg'
                alt='Yellow circle'
                width={129}
                height={129}
              />
              <Image
                className='lg:-mb-10-ml-6 absolute bottom-0 left-0 -mb-6 w-20 lg:-ml-12 lg:w-auto'
                src='/ui-assets/elements/dots3-blue.svg'
                alt='Blue dots'
                width={129}
                height={129}
              />
              <Image
                className='relative'
                src={image ?? ''}
                alt={section.title}
                width={554}
                height={415}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
