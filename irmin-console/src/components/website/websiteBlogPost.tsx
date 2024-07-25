'use client';

import Image from 'next/image';

import { useLocale } from '@/context/LocaleContext';

import { WebsiteArticleCategory } from '@/types/website/WebsiteContent';
import { Post } from '@/types/website/Wordpress';

/**
 * Website blog post component
 *
 * @remarks
 *
 * Displays a single blog post with the post content, title, author, date, and reading time.
 * The post content is rendered as HTML.
 *
 * The stylesheet for Gutenberg content is loaded from WordPress.
 * It has been moved there from this repository.
 *
 * See this {@link https://github.com/IrminData/irmin-frontend/commit/cef8f6d4864035e01e36623a2cf333a92d249590 | commit} for more details.
 */
export default function WebsiteBlogPost({
  post,
  categories,
  image,
}: {
  post: Post;
  categories: WebsiteArticleCategory[];
  image: string;
}) {
  const { locale } = useLocale();
  const wpURL =
    process.env.NEXT_PUBLIC_WORDPRESS_URL ?? 'https://cms.irmin.dev';
  return (
    <section
      id='post-post-section'
      className='bg-white py-12'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center top',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='mx-auto mb-12 text-center md:max-w-2xl'>
          <div className='flex items-center justify-center'>
            <p className='inline-block font-medium text-irmin_teal'>
              {post.yoast_head_json?.twitter_misc?.['Written by'] ?? 'Irmin'}
            </p>
            <span className='mx-1 text-irmin_teal-500'>•</span>
            <p className='inline-block font-medium text-irmin_teal'>
              {new Date(post.date).toLocaleDateString(locale)}
            </p>
            <span className='mx-1 text-irmin_teal-500'>•</span>
            <p className='inline-block font-medium text-irmin_teal'>
              {post.yoast_head_json?.twitter_misc?.['Estimated reading time'] ??
                '5 min read'}
            </p>
          </div>
          <h2 className='mb-4 text-3xl font-bold leading-tight tracking-tighter text-irmin_black md:text-5xl'>
            {post.title.rendered ?? "Article's title"}
          </h2>
          {categories.map((category, idx) => (
            <div
              key={`category-${idx}`}
              className='mr-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase leading-5 text-irmin_green-600 shadow-sm'
            >
              {category.name}
            </div>
          ))}
        </div>
        <div className='mx-auto mb-10 max-w-max overflow-hidden rounded-lg'>
          <Image
            src={image}
            alt={post.title.rendered}
            width={1000}
            height={600}
          />
        </div>
        <div className='wp-content mx-auto md:max-w-3xl'>
          <div
            dangerouslySetInnerHTML={{ __html: post.content.rendered }}
            className={'editor-styles-wrapper'}
          />
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: `
          <link
            rel='stylesheet'
            href='${wpURL}/wp-content/uploads/2024/07/wordpress.css'
          />
          `,
          }}
        />
      </div>
    </section>
  );
}
