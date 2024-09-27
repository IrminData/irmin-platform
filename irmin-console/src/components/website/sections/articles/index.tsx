import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';
import WordPress from '@/services/wordpress';

import WebsiteArticlesSectionContent from '@/components/website/sections/articles/content';

import {
  WebsiteArticle,
  WebsiteArticleCategory,
} from '@/types/website/WebsiteContent';
import { ArticlesSection } from '@/types/website/Wordpress';

/**
 * Website articles list section
 *
 * @remarks
 *
 * This component is used to display a list of blog posts on the website.
 * It uses ACF data from WordpressAPI.
 *
 * It fetches the blog posts from the WordPress API and filters them by the current language.
 *
 * The articles are then displayed in the {@link WebsiteArticlesSectionContent} component.
 */
export default async function WebsiteArticlesSection({
  section,
  lang,
}: {
  section: ArticlesSection;
  lang: Locale;
}) {
  const wordpress = WordPress.getInstance();
  const posts = (await wordpress.getPosts())?.filter((a) => {
    return a.link.includes(`/${lang}/`);
  });

  if (!posts) {
    notFound();
  }

  const articles: WebsiteArticle[] = [];
  const allCategories: WebsiteArticleCategory[] = [];

  const allCategoryIDs: number[] = [];

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
      excerpt: (
        post.yoast_head_json.og_description ??
        post.yoast_head_json.description ??
        ''
      ).replace('[&hellip;]', '...'),
      date: post.date,
      misc: post.yoast_head_json.twitter_misc,
      slug: post.slug,
      url: `/${lang}/article/${post.slug}/`,
      image: image ?? '',
      categories: categories,
    });
  }
  return (
    <WebsiteArticlesSectionContent
      section={section}
      articles={articles}
      categories={allCategories}
    />
  );
}
