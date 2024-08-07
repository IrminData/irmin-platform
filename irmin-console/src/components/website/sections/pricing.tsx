'use client';

import { useState } from 'react';

import Image from 'next/image';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { getURL } from '@/utils/wordpress';

import { PriceSection } from '@/types/website/Wordpress';

/**
 * Website pricing section
 *
 * @remarks
 *
 * This component is used to display the pricing section on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It displays the pricing plans with their titles, subtitles, prices, and bullet points.
 * The pricing plans are displayed as a list of cards with a title, price, and bullet points.
 *
 * The pricing section also includes a toggle button to switch between monthly and annual billing cycles.
 * The toggle button changes the prices and the billing cycle.
 */
export default function WebsitePricingSection({
  section,
}: {
  section: PriceSection;
}) {
  const { dict } = useLocale();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'monthly'
  );

  const handleToggle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly');
  };

  return (
    <section
      id='pricing-section'
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='text-center'>
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h3 className='mb-6 text-3xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
            {section.title}
          </h3>
          {section.description.length > 0 && (
            <p className='mb-12 text-lg font-light text-irmin_black'>
              {section.description}
            </p>
          )}
          <div className='mb-12 flex w-full items-center justify-center'>
            <button
              className={`mr-4 inline-block text-lg font-light md:text-xl ${billingCycle === 'monthly' ? 'text-irmin_black' : 'text-gray-400'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              {dict.website.sections.pricing.billedMonthly}
            </button>
            <label
              className='flex cursor-pointer items-center rounded-full shadow-lg'
              htmlFor='toggle'
              onClick={handleToggle}
            >
              <div className='relative'>
                <input
                  className='sr-only'
                  id='toggleB'
                  type='checkbox'
                  checked={billingCycle === 'annual'}
                  onChange={handleToggle}
                />
                <div
                  className={`block h-9 w-20 rounded-full ${billingCycle === 'annual' ? 'bg-irmin_green' : 'bg-gray-200'}`}
                />
                <div
                  className={`dot absolute top-1 h-7 w-7 rounded-full bg-white shadow-lg transition ${billingCycle === 'annual' ? 'right-1' : 'left-1'}`}
                />
              </div>
            </label>
            <button
              className={`ml-4 inline-flex items-center text-lg font-light md:text-xl ${billingCycle === 'annual' ? 'text-irmin_black' : 'text-gray-400'}`}
              onClick={() => setBillingCycle('annual')}
            >
              {dict.website.sections.pricing.billedAnnually}
              <span className='ml-2 rounded-full p-2 text-xs text-irmin_blue shadow'>
                {section.annual_saving_note}
              </span>
            </button>
          </div>
        </div>
        <div className='-mx-4 flex flex-wrap justify-center'>
          {section.prices.map((price, index) => (
            <div className='w-full p-4 md:w-1/2 lg:w-1/3' key={index}>
              <div className='flex h-full flex-col rounded-xl bg-green-50 pb-8 pt-8 shadow-md transition duration-500 hover:scale-105'>
                <div className='px-8 text-center'>
                  <h3 className='mb-2 text-3xl font-semibold tracking-tighter text-irmin_black md:text-4xl'>
                    {price.title}
                  </h3>
                  <p className='mb-6 font-light text-irmin_black'>
                    {price.subtitle}
                  </p>
                  <div className='mb-6'>
                    <span className='relative -top-10 right-1 text-3xl font-bold text-irmin_black'>
                      €
                    </span>
                    <span className='text-6xl font-semibold tracking-tighter text-irmin_black md:text-7xl'>
                      {billingCycle === 'monthly'
                        ? price.monthly_price
                        : price.annual_price}
                    </span>
                    <span className='ml-1 inline-block font-semibold text-irmin_black'>
                      /
                      {billingCycle === 'monthly'
                        ? dict.website.sections.pricing.month
                        : dict.website.sections.pricing.year}
                    </span>
                  </div>
                  <Button
                    size='lg'
                    variant='solid'
                    colorScheme='primary'
                    className='mb-8 inline-block w-full'
                    href={getURL(price.link)}
                  >
                    {price.link_text}
                  </Button>
                </div>
                <ul className='self-start px-8'>
                  {price.bullet_points.map((bullet, index) => (
                    <li
                      className='mb-4 flex items-center font-light text-irmin_black'
                      key={index}
                    >
                      <Image
                        className='mr-3'
                        src='/ui-assets/elements/checkbox-green.svg'
                        alt='Green checkbox'
                        width={26}
                        height={26}
                      />
                      <span>{bullet.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
