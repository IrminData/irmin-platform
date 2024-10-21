import Image from 'next/image';

import WordPress from '@/lib/wordpress';

import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { LogoCloudSection } from '@/types/website/Wordpress';

/**
 * Website logo cloud section
 *
 * @remarks
 *
 * This component is used to display a logo cloud section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays a list of logos with their titles.
 * The logos are displayed 5 logos per row, in a grayscale color.
 */
export default async function WebsiteLogoCloudSection({
  section,
}: {
  section: LogoCloudSection;
}) {
  const wordpress = WordPress.getInstance();

  const logos: {
    logo: string;
    title: string;
  }[] = [];

  for (let i = 0; i < section.logos.length; i++) {
    const logo = section.logos[i];
    const image =
      typeof logo.logo === 'number'
        ? await wordpress
            .getMediaByID(logo.logo)
            .then((media) => media?.source_url)
        : logo.logo;
    logos.push({
      logo: image ?? '',
      title: logo.title,
    });
  }
  return (
    <WebsiteSectionWrapper id='website-logo-cloud-section'>
      <div className='container mx-auto max-w-7xl px-4'>
        <h3 className='mb-8 text-center text-lg font-normal leading-6 text-white'>
          {section.title}
        </h3>
        <div className='-mx-4 flex flex-wrap justify-center'>
          {logos.map((logo, index) => (
            <div
              className='mb-8 w-1/2 px-4 md:w-1/3 lg:mb-0 lg:w-1/5'
              key={`logo-${index}`}
            >
              <Image
                className='mx-auto brightness-0 invert'
                src={logo.logo}
                alt={logo.title}
                width={186}
                height={44}
              />
            </div>
          ))}
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
}
