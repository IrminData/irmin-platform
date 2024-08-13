import { useTheme } from 'next-themes';

import { NumbersSection } from '@/types/website/Wordpress';

/**
 * Website numbers section
 *
 * @remarks
 *
 * This component is used to display the numbers section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the section title, subtitle, description, and metrics.
 * The metrics are displayed as a list of titles and descriptions.
 */
export default function WebsiteNumbersSection({
  section,
}: {
  section: NumbersSection;
}) {
  const { theme } = useTheme();
  return (
    <section
      id='numbers-section'
      className='bg-white py-12'
      style={{
        backgroundImage: `url("/ui-assets/elements/${theme !== 'dark' ? 'pattern-white' : 'pattern-dark'}.svg")`,
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='text-center'>
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white'>
            {section.subtitle}
          </span>
          <h3 className='mb-4 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
            {section.title}
          </h3>
          <p className='mb-16 text-sm font-light text-irmin_black md:text-base'>
            {section.description}
          </p>
          <div className='-mx-4 flex flex-wrap justify-center'>
            {section.metrics.map((metric, index) => (
              <div
                className='mb-8 w-full px-4 md:w-1/3 lg:mb-0 lg:w-1/4'
                key={`metric-${index}`}
              >
                <h2 className='mb-2 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
                  {metric.title}
                </h2>
                <p className='text-sm font-light text-irmin_black md:text-base'>
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
