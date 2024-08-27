import Image from 'next/image';

import WordPress from '@/services/wordpress';

import DynamicFaIcon from '@/components/common/DynamicFaIcon';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { FeaturesSection } from '@/types/website/Wordpress';

/**
 * Website features section
 *
 * @remarks
 *
 * This component is used to display a features section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, subtitle, description, features, and an image.
 * The features are displayed as a list of icons with titles and descriptions.
 *
 * Icons are displayed using {@link DynamicFaIcon} component.
 *
 * The image is displayed on the right side of the section.
 */
export default async function WebsiteFeaturesSection({
  section,
}: {
  section: FeaturesSection;
}) {
  const wordpress = WordPress.getInstance();
  const image =
    typeof section.image === 'number'
      ? await wordpress
          .getMediaByID(section.image)
          .then((media) => media?.source_url)
      : section.image;
  return (
    <WebsiteSectionWrapper id='website-features-section'>
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='mb-12 md:max-w-4xl'>
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-normal uppercase leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h1 className='font-display mb-4 text-3xl font-bold leading-tight tracking-tighter md:text-4xl'>
            {section.title}
          </h1>
          <p className='text-sm font-normal text-irmin_black md:text-base'>
            {section.description}
          </p>
        </div>
        <div className='-mx-4 flex flex-wrap lg:items-center'>
          <div className='order-2 mb-8 w-full px-4 md:order-1 md:mb-0 md:w-1/2'>
            {section.features.map((feature, index) => (
              <div
                className='mb-2 flex flex-wrap items-center gap-4 rounded-full p-4 text-center transition duration-200 md:text-left hover:md:bg-white hover:md:shadow-xl'
                key={`feature-${index}`}
              >
                <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-irmin_green-500 text-white md:mx-0'>
                  <DynamicFaIcon name={feature.icon} width={21} height={21} />
                </div>
                <div className='w-full md:flex-1'>
                  <h3 className='mb-2 text-lg font-normal leading-tight text-irmin_black md:text-xl'>
                    {feature.title}
                  </h3>
                  <p className='font-normal text-irmin_black'>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className='order-1 w-full px-4 md:order-2 md:w-1/2'>
            <div className='relative mx-auto max-w-max md:mr-0'>
              <Image
                className='absolute -left-8 -top-8 z-10 w-28 text-yellow-400 md:w-auto'
                src='/ui-assets/elements/circle3-yellow.svg'
                alt='Yellow circle'
                width={129}
                height={129}
              />
              <Image
                className='absolute -bottom-8 -right-7 z-10 w-28 text-blue-500 md:w-auto'
                src='/ui-assets/elements/dots3-blue.svg'
                alt='Blue dots'
                width={148}
                height={90}
              />
              <Image
                src={image ?? ''}
                alt={section.title}
                width={540}
                height={540}
              />
            </div>
          </div>
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
}
