'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { FaSearch } from 'react-icons/fa';

import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';

import { ArticlesSection } from '@/types/Wordpress';

export default function WebsiteBlogPostsContent({
  section,
  categories,
  articles,
}: {
  section: ArticlesSection;
  categories: {
    name: string;
    slug: string;
    id: number;
  }[];
  articles: {
    title: string;
    excerpt: string;
    date: string;
    misc?: {
      'Written by': string;
      'Estimated reading time': string;
    };
    slug: string;
    url: string;
    image: string;
    categories: {
      name: string;
      slug: string;
      id: number;
    }[];
  }[];
}) {
  const { dict } = useLocale();
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [filteredArticles, setFilteredArticles] = useState(articles);
  useEffect(() => {
    setFilteredArticles(
      articles.filter((article) => {
        return (
          (categoryFilter === '' ||
            article.categories.some(
              (category) => category.slug === categoryFilter
            )) &&
          (searchFilter === '' ||
            article.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(searchFilter.toLowerCase()))
        );
      })
    );
  }, [categoryFilter, searchFilter, articles]);

  return (
    <section
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left top',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='mx-auto mb-8 text-center md:mb-16 md:max-w-5xl'>
          <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium uppercase leading-5 text-white shadow-sm'>
            {section.subtitle}
          </span>
          <h3 className='mb-4 text-3xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
            {section.title}
          </h3>
          <p className='mb-10 text-base font-normal text-irmin_black md:text-lg'>
            {section.description}
          </p>
          <div className='relative mx-auto md:w-80'>
            <Input
              icon={<FaSearch />}
              variant='outline'
              colorScheme='black'
              type='text'
              placeholder={dict.website.sections.articles.search}
              className='w-full rounded-full border border-irmin_black bg-white shadow-md'
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>
        <ul className='-mx-2 mb-8 flex flex-wrap text-center'>
          <li
            className='w-full cursor-pointer px-2 md:w-auto'
            style={{
              borderBottom: categoryFilter === '' ? '1px solid black' : 'none',
            }}
            onClick={() => {
              setCategoryFilter('');
            }}
          >
            <span className='mb-4 inline-block w-full rounded-md px-4 py-2 text-sm text-irmin_black hover:bg-gray-100 hover:text-irmin_green hover:shadow-sm md:mb-0'>
              {dict.website.sections.articles.allArticles}
            </span>
          </li>
          {categories.map((category, idx) => (
            <li
              key={`category-${idx}`}
              className='w-full cursor-pointer px-2 md:w-auto'
              style={{
                borderBottom:
                  categoryFilter === category.slug ? '1px solid black' : 'none',
              }}
              onClick={() => {
                setCategoryFilter(category.slug);
              }}
            >
              <span className='mb-4 inline-block w-full rounded-md px-4 py-2 text-sm text-irmin_black hover:bg-gray-100 hover:text-irmin_green hover:shadow-sm md:mb-0'>
                {category.name}
              </span>
            </li>
          ))}
        </ul>
        <div className='-mx-4 mb-12 flex flex-wrap md:mb-20'>
          {filteredArticles.map((article, idx) => (
            <Link
              className='mb-8 w-full px-4 transition-all hover:opacity-80 md:w-1/2'
              key={`article-${idx}`}
              href={article.url}
            >
              <div className='mb-6 block overflow-hidden rounded-md'>
                <Image
                  className='w-full'
                  src={article.image}
                  alt={article.title}
                  width={500}
                  height={300}
                />
              </div>
              <div className='mb-4'>
                {article.categories.map((category, idx) => (
                  <span
                    key={`article-cat-${idx}`}
                    className='mr-2 inline-block rounded-full bg-irmin_green px-3 py-1 text-xs uppercase leading-5 text-white shadow-sm'
                  >
                    {category.name}
                  </span>
                ))}
              </div>
              <p className='mb-2 text-xs text-gray-400'>
                {article.misc?.['Written by'] ?? 'Irmin'} •{' '}
                {new Date(article.date).toLocaleDateString('en-US')} •{' '}
                {article.misc?.['Estimated reading time']}
              </p>
              <h3 className='mb-4 inline-block text-2xl font-bold leading-tight text-irmin_black'>
                {article.title}
              </h3>
              <p className='mb-4 text-xs font-light text-irmin_black md:text-sm'>
                {article.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
