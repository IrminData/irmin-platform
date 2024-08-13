import Image from 'next/image';

import WordPress from '@/services/wordpress';
import { useTheme } from 'next-themes';

import DynamicFaIcon from '@/components/common/DynamicFaIcon';

import { ContentSection } from '@/types/website/Wordpress';

/**
 * Website content section
 *
 * @remarks
 *
 * This component is used to display a content section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, subtitle, description, features, and an image.
 * The features are displayed as a list of icons with titles and descriptions.
 *
 * Icons are displayed using {@link DynamicFaIcon} component.
 *
 * The image is displayed on the right or left side of the section, depending on the ACF data.
 */
export default async function WebsiteContentSection({
  section,
}: {
  section: ContentSection;
}) {
  const { theme } = useTheme();
  const wordpress = WordPress.getInstance();

  const image =
    typeof section.main_image === 'number'
      ? await wordpress
          .getMediaByID(section.main_image)
          .then((media) => media?.source_url)
      : section.main_image;

  return (
    <section
      id='website-content-section'
      className='relative overflow-hidden bg-white py-12'
      style={{
        backgroundImage: `url("/ui-assets/elements/${theme !== 'dark' ? 'pattern-white' : 'pattern-dark'}.svg")`,
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto mb-16 flex w-full max-w-7xl flex-col items-start gap-4 px-4 md:mb-0 md:flex-row'>
        <div
          className={`max-w-xl md:w-1/2 ${section.image_first ? 'order-2' : 'order-1'}`}
        >
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h3 className='mb-6 text-4xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
            {section.title}
          </h3>
          <p className='mb-12 text-sm font-light text-irmin_black md:text-base'>
            {section.description}
          </p>
          {section.features.map((feature, index) => (
            <div
              className='mb-2 flex flex-wrap items-center gap-4 rounded-full p-4 text-center transition duration-200 md:text-left hover:lg:bg-white hover:lg:shadow-xl'
              key={`feature-${index}`}
            >
              <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-irmin_green-500 text-white md:mx-0'>
                <DynamicFaIcon name={feature.icon} width={21} height={21} />
              </div>
              <div className='w-full md:flex-1'>
                <h3 className='mb-2 text-lg font-normal leading-tight text-irmin_black md:text-xl'>
                  {feature.title}
                </h3>
                <p className='font-light text-irmin_black'>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`relative max-w-full md:w-1/2 ${section.image_first ? 'order-1' : 'order-2'}`}
        >
          <Image
            className='z-20 w-full rounded-xl object-contain'
            src={image ?? ''}
            alt={section.title}
            width={731}
            height={470}
          />
          <Image
            className='absolute -top-24 right-0 w-28 text-blue-500'
            src='/ui-assets/elements/dots2-blue.svg'
            alt='Blue dots'
            width={100}
            height={100}
          />
          <Image
            className='absolute -bottom-24 left-0 hidden w-28 text-red-800 md:block'
            src='/ui-assets/elements/dots2-red.svg'
            alt='Red dots'
            width={100}
            height={100}
          />
          <Image
            className={`absolute top-1/2 w-28 -translate-y-1/2 transform text-yellow-400 ${section.image_first ? '-left-24' : '-right-24'}`}
            src='/ui-assets/elements/circle-yellow.svg'
            alt='Yellow circle'
            width={100}
            height={100}
          />
        </div>
      </div>
    </section>
  );
}
