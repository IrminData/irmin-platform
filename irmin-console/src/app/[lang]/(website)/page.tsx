import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getURL } from '@/lib/utils/wordpressLinkUtils';
import WordPress from '@/lib/wordpress';

import WebsitePageContent from '@/components/WebsitePageContent';
import WebsiteSections from '@/components/WebsiteSections';

type PageProps = {
  params: {
    lang: string;
  };
};

const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

export default async function WebsiteHome({ params }: PageProps) {
  const lang = params.lang;
  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(lang === 'en' ? 'home' : 'etusivu');

  if (!page) {
    notFound();
  }

  return (
    <>
      <WebsitePageContent
        content={page.content.rendered}
        full_width={page.acf?.full_width ?? false}
      />
      <WebsiteSections
        sections={page.acf?.sections ?? []}
        lang={lang ?? 'en'}
      />
    </>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const lang = params.lang;
  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(lang === 'en' ? 'home' : 'etusivu');
  if (!page) {
    return {
      title: 'Page not found | IRMIN',
    };
  }

  return {
    title: page.yoast_head_json.title ?? page.title.rendered,
    description:
      page.yoast_head_json.og_description ?? page.yoast_head_json.description,
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
