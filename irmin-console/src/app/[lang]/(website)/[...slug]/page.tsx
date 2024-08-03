import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';
import WordPress from '@/services/wordpress';

import PageContent from '@/components/website/templates/PageContent';
import PageSections from '@/components/website/templates/PageSections';

import { getURL } from '@/utils/wordpress';

const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

/**
 * Router properties received by the page
 */
type PageProps = {
  params: {
    slug: string | string[];
    lang: Locale;
  };
};

/**
 * Normal page (Website)
 *
 * @remarks
 *
 * Using router properties, like slug, it fetches the page
 * content from WordPress API and renders it.
 *
 * It uses PageContent and PageSections to render
 * the page content and sections it receives from WordPress
 * API.
 *
 * @param param0 - Router properties received by the page
 * @returns Page content
 */
export default async function Page({ params }: PageProps) {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

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
      <PageContent
        content={page.content?.rendered ?? ''}
        full_width={page.acf?.full_width ?? false}
      />
      <PageSections sections={page.acf?.sections ?? []} lang={lang} />
    </>
  );
}

/**
 * Metadata for SEO of the page (Website)
 *
 * @remarks
 * Using router properties, like slug, it fetches the page
 * metadata from WordPress API and returns it.
 *
 * @param param0 - Router properties received by the page
 * @returns metadata for SEO of the page
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

  const slug =
    typeof params.slug === 'string'
      ? params.slug
      : params.slug[params.slug.length - 1];

  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(slug);

  if (!page) {
    return {
      title: `${dictionaries[lang].misc.pageNotFound} | IRMIN`,
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
