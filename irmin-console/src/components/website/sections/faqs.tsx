import DynamicFaIcon from '@/components/common/DynamicFaIcon';

import { FAQSection } from '@/types/website/Wordpress';

/**
 * Website FAQs section
 *
 * @remarks
 *
 * This component is used to display a FAQs section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * Icons are displayed using {@link DynamicFaIcon} component.
 *
 * It displays the section title, subtitle, and a list of questions with answers.
 * The questions are displayed as a list of icons with titles and descriptions.
 */
export default function WebsiteFaqsSection({
  section,
}: {
  section: FAQSection;
}) {
  return (
    <section
      id='faq-section'
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='max-w-4xl'>
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
            {section.title}
          </h2>
          <p className='mb-8 text-sm font-light text-irmin_black md:text-base'>
            {section.description}
          </p>
        </div>
        <div className='-mx-4 flex flex-wrap pb-16'>
          {section.questions.map((question, index) => (
            <div
              className='mb-8 w-full px-4 md:w-1/2 xl:w-1/3'
              key={`question-${index}`}
            >
              <div className='md:max-w-xs'>
                <div className='mb-4 hidden h-12 w-12 items-center justify-center rounded-full bg-irmin_blue md:inline-flex'>
                  <DynamicFaIcon name={question.icon} className='text-white' />
                </div>
                <div className='mb-4 flex flex-row items-center gap-4'>
                  <div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_blue md:hidden'>
                    <DynamicFaIcon
                      name={question.icon}
                      className='text-white'
                    />
                  </div>
                  <h3 className='text-xl font-bold text-irmin_black'>
                    {question.title}
                  </h3>
                </div>

                <p className='font-light text-irmin_black'>
                  {question.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
