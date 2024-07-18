import { notFound } from 'next/navigation';

import WordPress from '@/lib/wordpress';

import { ArticlesSection } from '@/types/Wordpress';

import WebsiteBlogPostsContent from './websiteBlogPostsContent';

export default async function WebsiteBlogPosts({
  section,
  lang,
}: {
  section: ArticlesSection;
  lang: string;
}) {
  const wordpress = WordPress.getInstance();
  const posts = (await wordpress.getPosts())?.filter((a) => {
    return a.link.includes(`/${lang}/`);
  });

  if (!posts) {
    return notFound();
  }

  const articles: {
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
  }[] = [];
  const allCategoryIDs: number[] = [];
  const allCategories: {
    name: string;
    slug: string;
    id: number;
  }[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const image =
      typeof post.featured_media === 'number'
        ? await wordpress
            .getMediaByID(post.featured_media)
            .then((media) => media?.source_url)
        : '';

    const categories: {
      name: string;
      slug: string;
      id: number;
    }[] = [];

    if (post.categories) {
      for (let a = 0; a < post.categories.length; a++) {
        const catID = post.categories[a];
        const category = await wordpress.getCategoryByID(catID);
        categories.push({
          name: category?.name ?? '',
          slug: category?.slug ?? '',
          id: catID,
        });
        if (!allCategoryIDs.includes(catID)) {
          allCategoryIDs.push(catID);
          allCategories.push({
            name: category?.name ?? '',
            slug: category?.slug ?? '',
            id: catID,
          });
        }
      }
    }

    articles.push({
      title: post.title.rendered,
      excerpt: post.yoast_head_json.og_description.replace('[&hellip;]', '...'),
      date: post.date,
      misc: post.yoast_head_json.twitter_misc,
      slug: post.slug,
      url: `/${lang}/article/${post.slug}/`,
      image: image ?? '',
      categories: categories,
    });
  }
  return (
    <WebsiteBlogPostsContent
      section={section}
      articles={articles}
      categories={allCategories}
    />
  );
}
