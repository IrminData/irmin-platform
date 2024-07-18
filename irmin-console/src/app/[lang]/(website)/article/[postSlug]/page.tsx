import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import WordPress from '@/lib/wordpress';

import WebsiteBlogPost from '@/components/website/websiteBlogPost';

interface PageProps {
  params: {
    lang: string;
    postSlug: string | string[];
  };
}

const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

export default async function Page({ params }: PageProps) {
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
    }
  }

  return (
    <WebsiteBlogPost post={post} categories={categories} image={image ?? ''} />
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const lang = params.lang;
  const slug =
    typeof params.postSlug === 'string'
      ? params.postSlug
      : params.postSlug[params.postSlug.length - 1];
  const wordpress = WordPress.getInstance();
  const post = await wordpress.getPost(slug);
  if (!post) {
    return {
      title: 'Article not found | IRMIN',
    };
  }
  return {
    title: post.yoast_head_json.title,
    description: post.yoast_head_json.og_description,
    openGraph: {
      type: 'article',
      locale: lang,
      url: NEXT_PUBLIC_BASE_URL + '/' + lang + '/article/' + slug + '/',
      title: post.yoast_head_json.og_title,
      description: post.yoast_head_json.og_description,
      images: post.yoast_head_json.og_image,
    },
  };
}
