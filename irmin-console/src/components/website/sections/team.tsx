import Image from 'next/image';

import WordPress from '@/services/wordpress';

import Button from '@/components/misc/Button';
import DynamicFaIcon from '@/components/misc/DynamicFaIcon';

import { getURL } from '@/utils/wordpress';

import { TeamSection } from '@/types/website/Wordpress';

/**
 * Website team section
 *
 * @remarks
 *
 * This component is used to display the team section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the team section title, subtitle, description, and buttons.
 * The buttons are displayed as a list of links with text and colors.
 * The team section also includes a list of team members with their profiles, names, titles, and descriptions.
 */
export default async function WebsiteTeamSection({
  section,
}: {
  section: TeamSection;
}) {
  const wordpress = WordPress.getInstance();

  const people: {
    profile: string;
    name: string;
    title: string;
    description: string;
  }[] = [];

  for (let i = 0; i < section.people.length; i++) {
    const person = section.people[i];
    const image =
      typeof person.profile === 'number'
        ? await wordpress
            .getMediaByID(person.profile)
            .then((media) => media?.source_url)
        : person.profile;
    people.push({
      ...person,
      profile: image ?? '',
    });
  }
  return (
    <section
      id='team-section'
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='-mx-4 mb-16 flex flex-wrap items-center justify-between'>
          <div className='mb-8 w-full px-4 md:mb-0 md:w-1/2'>
            <div className='max-w-md'>
              <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium uppercase leading-5 text-white'>
                {section.subtitle}
              </span>
              <h3 className='mb-4 text-4xl font-bold tracking-tighter md:text-5xl'>
                {section.title}
              </h3>
              <p className='text-sm font-light text-irmin_black md:text-base'>
                {section.description}
              </p>
            </div>
          </div>
          <div className='w-full px-4 md:w-auto'>
            <div className='flex flex-wrap justify-center gap-4'>
              {section.buttons.map((button, index) => (
                <Button
                  key={`button-${index}`}
                  className='inline-block w-full rounded-full border border-irmin_green-500 bg-irmin_green-500 px-7 py-5 text-center text-base font-medium leading-4 text-white shadow-sm hover:bg-irmin_green-600 md:text-lg'
                  size='lg'
                  variant={button.variant}
                  colorScheme={button.color_scheme}
                  icon={
                    button.icon ? (
                      <DynamicFaIcon name={button.icon} />
                    ) : undefined
                  }
                  ariaLabel={button.text}
                  href={getURL(button.link)}
                >
                  {button.text}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className='-mx-4 flex flex-wrap'>
          {people.map((person, index) => (
            <div
              className='mb-12 w-full px-4 md:w-1/2 lg:w-1/3'
              key={`person-${index}`}
            >
              <div className='mx-auto max-w-max'>
                <Image
                  className='mb-8 block'
                  src={person.profile}
                  alt={person.name}
                  width={359}
                  height={384}
                />
                <h3 className='mb-2 text-3xl font-semibold leading-tight md:text-4xl'>
                  {person.name}
                </h3>
                <span className='text-lg font-medium text-irmin_green-500'>
                  {person.title}
                </span>
                {person.description.length > 0 && (
                  <p className='mt-2 text-base text-irmin_black'>
                    {person.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
