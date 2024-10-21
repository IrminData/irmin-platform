import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { defaultLocale, dictionaries, Locale } from '@/lib/dict';

import WordPress from '@/lib/wordpress';

import Post from '@/components/website/templates/Post';

import { WebsiteArticleCategory } from '@/types/website/WebsiteContent';

const app_base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

/**
 * Router properties received by the page
 */
type PageProps = {
  params: {
    lang: Locale;
    postSlug: string | string[];
  };
};

/**
 * Single article/blog post page (Website)
 *
 * @remarks
 *
 * Using router properties, like postSlug, it fetches the post
 * content from WordPress API and renders it.
 *
 * It uses Post to render the post content and
 * categories it receives from WordPress API.
 */
export default async function Page(props: PageProps) {
  const params = await props.params;
  const slug =
    typeof params.postSlug === 'string'
      ? params.postSlug
      : params.postSlug[params.postSlug.length - 1];
  const wordpress = WordPress.getInstance();
  const post = await wordpress.getPost(slug);

  if (!post) {
    notFound();
  }

  const image =
    typeof post.featured_media === 'number'
      ? await wordpress
          .getMediaByID(post.featured_media)
          .then((media) => media?.source_url)
      : '';

  const categories: WebsiteArticleCategory[] = [];

  if (post.categories) {
    for (let a = 0; a < post.categories.length; a++) {
      const catID = post.categories[a];
      const category = await wordpress.getCategoryByID(catID);
      categories.push({
        name: category?.name ?? '',
        slug: category?.slug ?? '',
        id: catID,
      });
    }
  }

  return <Post post={post} categories={categories} image={image ?? ''} />;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

  const slug =
    typeof params.postSlug === 'string'
      ? params.postSlug
      : params.postSlug[params.postSlug.length - 1];

  const wordpress = WordPress.getInstance();
  const post = await wordpress.getPost(slug);

  if (!post) {
    return {
      title: `${dictionaries[lang].misc.articleNotFound} | IRMIN`,
    };
  }

  return {
    title: post.yoast_head_json.title,
    description: post.yoast_head_json.og_description,
    openGraph: {
      type: 'article',
      locale: lang,
      url: app_base + '/' + lang + '/article/' + slug + '/',
      title: post.yoast_head_json.og_title,
      description: post.yoast_head_json.og_description,
      images: post.yoast_head_json.og_image,
    },
  };
}
