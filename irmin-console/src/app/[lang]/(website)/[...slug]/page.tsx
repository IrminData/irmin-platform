import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getURL } from '@/lib/linkUtil';
import WordPress from '@/lib/wordpress';

import WebsitePageContent from '@/components/WebsitePageContent';
import WebsiteSections from '@/components/WebsiteSections';

interface PageProps {
  params: {
    slug: string | string[];
    lang: string;
  };
}

const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

export default async function Page({ params }: PageProps) {
  const lang = params.lang;
  const slug =
    typeof params.slug === 'string'
      ? params.slug
      : params.slug[params.slug.length - 1];
  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <WebsitePageContent
        content={page.content?.rendered ?? ''}
        full_width={page.acf?.full_width ?? false}
      />
      <WebsiteSections sections={page.acf?.sections ?? []} lang={lang} />
    </>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const lang = params.lang;
  const slug =
    typeof params.slug === 'string'
      ? params.slug
      : params.slug[params.slug.length - 1];
  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(slug);
  if (!page) {
    return {
      title: 'Page not found | IRMIN',
    };
  }
  return {
    title: page.yoast_head_json.title,
    description: page.yoast_head_json.og_description,
    openGraph: {
      type: 'website',
      locale: lang,
      url: NEXT_PUBLIC_BASE_URL + getURL(page.link),
      title: page.yoast_head_json.og_title,
      description: page.yoast_head_json.og_description,
      images: page.yoast_head_json.og_image,
    },
  };
}
