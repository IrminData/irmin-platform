'use client';

import { useEffect, useState } from 'react';

import { getURL } from '@/lib/utils/wordpressLinkUtils';

import { FaSearch } from 'react-icons/fa';
import { IoInformation, IoLocationOutline } from 'react-icons/io5';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

import { CareersSection } from '@/types/website/Wordpress';

export default function WebsiteCareersSection({
  section,
}: {
  section: CareersSection;
}) {
  const { dict } = useLocale();

  const [filteredPositions, setFilteredPositions] = useState<
    typeof section.open_positions
  >(section.open_positions);
  const [stringFilter, setStringFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>(
    dict.website.sections.careers.allLocations
  );
  const [typeFilter, setTypeFilter] = useState<string>(
    dict.website.sections.careers.allTypes
  );

  useEffect(() => {
    setFilteredPositions(
      section.open_positions.filter(
        (position) =>
          position.role.toLowerCase().includes(stringFilter.toLowerCase()) &&
          (locationFilter === dict.website.sections.careers.allLocations ||
            position.location === locationFilter) &&
          (typeFilter === dict.website.sections.careers.allTypes ||
            position.note === typeFilter)
      )
    );
  }, [stringFilter, locationFilter, typeFilter, dict, section.open_positions]);

  const uniqueLocations = section.open_positions
    .map((position) => position.location)
    .filter((value, index, self) => self.indexOf(value) === index);
  const uniqueTypes = section.open_positions
    .map((position) => position.note)
    .filter((value, index, self) => self.indexOf(value) === index);

  return (
    <section
      id='careers-section'
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='mx-auto mb-8 max-w-4xl text-center'>
          <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium uppercase leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h3 className='mb-4 text-3xl font-bold leading-tight tracking-tighter md:text-4xl'>
            {section.title}
          </h3>
          <p className='mb-4 text-sm font-light text-irmin_black md:text-base'>
            {section.description}
          </p>
        </div>
        <div className='mx-auto max-w-6xl'>
          <div className='-mx-3 mb-14 flex flex-wrap items-center justify-center gap-3'>
            <div className='w-full px-3 md:mb-0 md:w-1/3'>
              <Input
                icon={<FaSearch />}
                variant='outline'
                colorScheme='black'
                type='text'
                placeholder={dict.website.sections.careers.search}
                className='w-full rounded-full border border-irmin_black bg-white shadow-md'
                onChange={(e) => setStringFilter(e.target.value)}
              />
            </div>
            <div className='w-full px-3 md:w-1/3'>
              <div className='relative rounded-full border border-irmin_black bg-white shadow-md'>
                <svg
                  className='absolute right-0 top-1/2 mr-5 -translate-y-1/2 transform'
                  width={12}
                  height={8}
                  viewBox='0 0 12 8'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M11.0002 1.17C10.8128 0.983753 10.5594 0.879211 10.2952 0.879211C10.031 0.879211 9.77756 0.983753 9.59019 1.17L6.00019 4.71L2.46019 1.17C2.27283 0.983753 2.01938 0.879211 1.75519 0.879211C1.49101 0.879211 1.23756 0.983753 1.05019 1.17C0.956464 1.26297 0.88207 1.37357 0.831301 1.49543C0.780533 1.61729 0.754395 1.74799 0.754395 1.88C0.754395 2.01202 0.780533 2.14272 0.831301 2.26458C0.88207 2.38644 0.956464 2.49704 1.05019 2.59L5.29019 6.83C5.38316 6.92373 5.49376 6.99813 5.61562 7.04889C5.73747 7.09966 5.86818 7.1258 6.00019 7.1258C6.1322 7.1258 6.26291 7.09966 6.38477 7.04889C6.50663 6.99813 6.61723 6.92373 6.71019 6.83L11.0002 2.59C11.0939 2.49704 11.1683 2.38644 11.2191 2.26458C11.2699 2.14272 11.296 2.01202 11.296 1.88C11.296 1.74799 11.2699 1.61729 11.2191 1.49543C11.1683 1.37357 11.0939 1.26297 11.0002 1.17Z'
                    fill='#556987'
                  />
                </svg>
                <select
                  className='w-full appearance-none rounded-full border-0 bg-transparent px-4 py-3 leading-6 text-irmin_black outline-none hover:cursor-pointer focus:outline-none'
                  name='location-filter'
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option>{dict.website.sections.careers.allLocations}</option>
                  {uniqueLocations.map((location, i) => (
                    <option key={`location-${i}`} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='w-full px-3 md:w-1/3'>
              <div className='relative rounded-full border border-irmin_black bg-white shadow-md'>
                <svg
                  className='absolute right-0 top-1/2 mr-5 -translate-y-1/2 transform'
                  width={12}
                  height={8}
                  viewBox='0 0 12 8'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M11.0002 1.17C10.8128 0.983753 10.5594 0.879211 10.2952 0.879211C10.031 0.879211 9.77756 0.983753 9.59019 1.17L6.00019 4.71L2.46019 1.17C2.27283 0.983753 2.01938 0.879211 1.75519 0.879211C1.49101 0.879211 1.23756 0.983753 1.05019 1.17C0.956464 1.26297 0.88207 1.37357 0.831301 1.49543C0.780533 1.61729 0.754395 1.74799 0.754395 1.88C0.754395 2.01202 0.780533 2.14272 0.831301 2.26458C0.88207 2.38644 0.956464 2.49704 1.05019 2.59L5.29019 6.83C5.38316 6.92373 5.49376 6.99813 5.61562 7.04889C5.73747 7.09966 5.86818 7.1258 6.00019 7.1258C6.1322 7.1258 6.26291 7.09966 6.38477 7.04889C6.50663 6.99813 6.61723 6.92373 6.71019 6.83L11.0002 2.59C11.0939 2.49704 11.1683 2.38644 11.2191 2.26458C11.2699 2.14272 11.296 2.01202 11.296 1.88C11.296 1.74799 11.2699 1.61729 11.2191 1.49543C11.1683 1.37357 11.0939 1.26297 11.0002 1.17Z'
                    fill='#556987'
                  />
                </svg>
                <select
                  className='w-full appearance-none rounded-full border-0 bg-transparent px-4 py-3 leading-6 text-irmin_black outline-none hover:cursor-pointer focus:outline-none'
                  name='note-filter'
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option>{dict.website.sections.careers.allTypes}</option>
                  {uniqueTypes.map((type, i) => (
                    <option key={`type-${i}`} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        {filteredPositions.map((position, i) => (
          <div
            key={`open-position-${i}`}
            className='-mx-4 mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-green-50 px-4 py-7'
          >
            <div className='mb-6 mr-auto w-full md:mb-0 md:w-auto'>
              <h3 className='mb-2 text-lg font-semibold md:text-xl'>
                {position.role}
              </h3>
              <p className='text-sm font-light text-irmin_black'>
                {position.description}
              </p>
            </div>
            <div className='flex flex-row items-center gap-4'>
              <div className='order-2 flex w-full min-w-max flex-col gap-2 lg:order-1'>
                <div className='inline-flex w-full items-center'>
                  <div className='text-irmin_black'>
                    <IoLocationOutline width={24} height={24} />
                  </div>
                  <span className='ml-2 font-medium text-irmin_black'>
                    {position.location}
                  </span>
                </div>
                <div className='inline-flex w-full items-center'>
                  <div className='text-irmin_black'>
                    <IoInformation width={24} height={24} />
                  </div>
                  <span className='ml-2 font-medium text-irmin_black'>
                    {position.note}
                  </span>
                </div>
              </div>
              <Button
                variant='solid'
                colorScheme='primary'
                className='order-1 w-full min-w-24 lg:order-2'
                href={getURL(position.link)}
              >
                {dict.website.sections.careers.viewJob}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
