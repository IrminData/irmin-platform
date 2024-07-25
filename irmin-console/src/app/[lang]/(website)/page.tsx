import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';
import { getURL } from '@/lib/utils/wordpressLinkUtils';
import WordPress from '@/lib/wordpress';

import WebsitePageContent from '@/components/WebsitePageContent';
import WebsiteSections from '@/components/WebsiteSections';

const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

/**
 * Router properties received by the page
 */
type PageProps = {
  params: {
    lang: Locale;
  };
};

/**
 * Website home page (Website)
 *
 * @remarks
 *
 * This page exists to make the home pages for different languages
 * available at website.com/locale/, eg. website.com/fr/, etc.
 *
 * Based on the selected router lang path it fetches the page
 * content from WordPress API and renders it. The slug for the
 * home page is defined in the dictionary for each language.
 *
 * It uses WebsitePageContent and WebsiteSections to render
 * the page content and sections it receives from WordPress
 * API.
 *
 * @param param0 - Router properties received by the page
 * @returns Page content
 */
export default async function WebsiteHome({ params }: PageProps) {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(
    dictionaries[lang].static.wordpressHomePageSlug
  );

  if (!page) {
    notFound();
  }

  return (
    <>
      <WebsitePageContent
        content={page.content.rendered}
        full_width={page.acf?.full_width ?? false}
      />
      <WebsiteSections sections={page.acf?.sections ?? []} lang={lang} />
    </>
  );
}

/**
 * Generate SEO metadata for the website home page
 *
 * @param param0 - Router properties received by the page
 * @returns Metadata for the page
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

  const wordpress = WordPress.getInstance();
  const page = await wordpress.getPage(
    dictionaries[lang].static.wordpressHomePageSlug
  );

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
