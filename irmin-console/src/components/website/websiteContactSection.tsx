'use client';

import Link from 'next/link';

import Button from '@/components/misc/Button';
import DynamicFaIcon from '@/components/misc/DynamicFaIcon';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

import { getURL } from '@/utils/wordpress';

import { ContactSection } from '@/types/website/Wordpress';

/**
 * Website contact section
 *
 * @remarks
 *
 * This component is used to display the contact section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the contact information with social media links and contact methods.
 *
 * Icons are displayed using {@link DynamicFaIcon} component.
 *
 * The contact form can be used to send message to Irmin.
 * @todo Contact form submission is not implemented yet.
 */
export default function WebsiteContactSection({
  section,
}: {
  section: ContactSection;
}) {
  const { dict } = useLocale();
  return (
    <>
      <section
        className='bg-white pb-16'
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
      >
        <div className='container mx-auto max-w-7xl px-4'>
          <div className='lg:mb-18 mb-24 flex flex-wrap items-center justify-between'>
            <div className='mb-10 w-full lg:mb-0 lg:w-1/2'>
              <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
                {section.subtitle}
              </span>
              <h3 className='mb-4 text-4xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
                {section.title}
              </h3>
              <p className='mb-4 text-sm font-light text-irmin_black md:text-base'>
                {section.description}
              </p>
              <div className='max-w-md'>
                <div className='flex flex-wrap items-center justify-start gap-4'>
                  {section.socials.map((social, index) => (
                    <Link
                      key={`social-${index}`}
                      className='inline-flexitems-center justify-center rounded-full bg-gray-100 p-3 text-3xl text-irmin_blue transition-all hover:text-irmin_blue-400'
                      href={getURL(social.link)}
                    >
                      <DynamicFaIcon name={social.icon} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className='w-full lg:w-auto'>
              <div className='-mb-2 flex flex-wrap items-center justify-center gap-4 md:justify-start'>
                {section.buttons.map((button, index) => (
                  <div
                    className={`w-full md:w-[calc(50%-8px)]`}
                    key={`button-${index}`}
                  >
                    <Button
                      variant={button.variant}
                      colorScheme={button.color_scheme}
                      icon={
                        button.icon ? (
                          <DynamicFaIcon name={button.icon} />
                        ) : undefined
                      }
                      size='md'
                      className={`w-full`}
                      href={getURL(button.link)}
                    >
                      {button.text}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='-mx-4 flex flex-wrap'>
            <div className='mb-14 w-full px-4 lg:mb-0 lg:w-1/2'>
              <div className='-mx-4 flex flex-wrap'>
                {section.contact_methods.map((contact, index) => (
                  <div
                    className='mb-10 w-full px-4 md:w-1/3'
                    key={`contact-method-${index}`}
                  >
                    <div className='flex max-w-xs flex-row items-center justify-start gap-4'>
                      <div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green-500 p-3 text-white'>
                        <DynamicFaIcon name={contact.icon} />
                      </div>
                      <div>
                        <h3 className='text-lg font-bold leading-9 text-irmin_black'>
                          {contact.title}
                        </h3>
                        <p className='text-lg font-light text-irmin_black hover:text-irmin_black md:text-xl'>
                          {contact.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='w-full px-4 lg:w-1/2'>
              <div className='rounded-xl bg-green-50 px-4 py-8 md:p-10'>
                <form>
                  <div className='mb-6'>
                    <label className='mb-2 block font-light leading-6 text-irmin_black'>
                      {dict.website.sections.contact.email}
                    </label>
                    <Input
                      variant='solid'
                      colorScheme='black'
                      type='email'
                      placeholder='me@example.com'
                      className='w-full'
                    />
                  </div>
                  <div className='mb-6'>
                    <label
                      className='mb-2 block font-light leading-6 text-irmin_black'
                      htmlFor=''
                    >
                      {dict.website.sections.contact.message}
                    </label>
                    <textarea
                      className='block h-32 w-full resize-none appearance-none rounded-lg border border-irmin_black px-3 py-2 leading-6 text-irmin_black shadow-md md:h-52'
                      placeholder={
                        dict.website.sections.contact.messagePlaceholder
                      }
                      defaultValue={''}
                    />
                  </div>
                  <Button
                    size='md'
                    className='w-full'
                    colorScheme='primary'
                    variant='solid'
                  >
                    {dict.website.sections.contact.send}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
