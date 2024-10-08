import Image from 'next/image';

import WordPress from '@/services/wordpress';

import Button from '@/components/ui/Button';
import DynamicFaIcon from '@/components/ui/DynamicFaIcon';
import WebsiteSectionWrapper from '@/components/website/WebsiteSectionWrapper';

import { getURL } from '@/utils/wordpress';

import { HeroSection } from '@/types/website/Wordpress';

/**
 * Website hero section
 *
 * @remarks
 *
 * This component is used to display the hero section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, description, and buttons.
 * The buttons are displayed as a list of links with text and colors.
 *
 * The hero section also includes a video background with a placeholder image.
 * The video is displayed as a background video with a play button.
 * The video is muted and loops automatically.
 */
export default async function WebsiteHeroSection({
  section,
}: {
  section: HeroSection;
}) {
  const wordpress = WordPress.getInstance();
  const videoPlaceholder =
    typeof section.video_placeholder === 'number'
      ? await wordpress
          .getMediaByID(section.video_placeholder)
          .then((media) => media?.source_url)
      : section.video_placeholder;
  const video =
    typeof section.video === 'number'
      ? await wordpress
          .getMediaByID(section.video)
          .then((media) => media?.source_url)
      : section.video;
  return (
    <WebsiteSectionWrapper id='website-hero-section'>
      <div className='container mx-auto mt-12 flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 text-center'>
        <h1 className='mb-8 font-display text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl'>
          {section.title_parts.map((titlePart, index) => (
            <span
              key={`title-part-${index}`}
              className={`${
                !titlePart.green
                  ? 'text-foreground dark:text-gray-300'
                  : 'text-irmin_green'
              }`}
            >
              {titlePart.title}
            </span>
          ))}
        </h1>
        {section.description.length > 0 && (
          <p className='mx-auto mb-8 max-w-3xl text-base font-normal leading-5 text-gray-700 dark:text-gray-200 sm:text-lg'>
            {section.description}
          </p>
        )}
        <div className='flex flex-wrap justify-center'>
          {section.buttons.map((button, index) => (
            <div
              className='w-full py-1 md:mr-4 md:w-auto md:py-0'
              key={`button-${index}`}
            >
              <Button
                size='lg'
                variant={button.variant}
                icon={
                  button.icon ? <DynamicFaIcon name={button.icon} /> : undefined
                }
                className='w-full'
                aria-label={button.text}
                href={getURL(button.link)}
              >
                {button.text}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className='container mx-auto max-w-7xl px-4 pb-8'>
        <div className='relative mx-auto max-w-max'>
          <Image
            className='absolute -left-8 -top-8 z-20 w-28 md:w-auto'
            src='/ui-assets/elements/wave-green.svg'
            alt='Green wave'
            width={180}
            height={81}
          />
          <Image
            className='absolute -bottom-8 -right-8 w-28 md:w-auto'
            src='/ui-assets/elements/wave-yellow.svg'
            alt='Yellow wave'
            width={180}
            height={81}
          />
          <div className='relative max-h-[600px] overflow-hidden rounded-xl'>
            <Image
              src={videoPlaceholder ?? ''}
              alt='Video placeholder image'
              width={1100}
              height={600}
            />
            <video
              className='absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 transform object-cover'
              poster={videoPlaceholder}
              autoPlay
              muted
              loop
            >
              <source src={video} type='video/mp4' />
            </video>
          </div>
        </div>
      </div>
    </WebsiteSectionWrapper>
  );
}
