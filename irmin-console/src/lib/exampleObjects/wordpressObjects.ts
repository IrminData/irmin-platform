import { Media, Menu, Post } from '@/types/website/Wordpress';

/**
 * Example WordPress category object
 */
export const exampleWPCategory: Post = {
  id: 19,
  link: 'https://cms.irmin.dev/en/category/irmin-news/',
  name: 'Irmin News',
  slug: 'irmin-news',
  yoast_head:
    '<!-- This site is optimized with the Yoast SEO plugin v23.0 - https://yoast.com/wordpress/plugins/seo/ -->\n<title>Irmin News Archives | IRMIN</title>\n<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />\n<meta property="og:locale" content="en_GB" />\n<meta property="og:type" content="article" />\n<meta property="og:title" content="Irmin News Archives | IRMIN" />\n<meta property="og:url" content="https://cms.irmin.dev/en/category/irmin-news/" />\n<meta property="og:site_name" content="IRMIN" />\n<meta property="og:image" content="https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3.jpg" />\n\t<meta property="og:image:width" content="1440" />\n\t<meta property="og:image:height" content="641" />\n\t<meta property="og:image:type" content="image/jpeg" />\n<meta name="twitter:card" content="summary_large_image" />\n<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":"https://cms.irmin.dev/en/category/irmin-news/","url":"https://cms.irmin.dev/en/category/irmin-news/","name":"Irmin News Archives | IRMIN","isPartOf":{"@id":"https://cms.irmin.dev/#website"},"breadcrumb":{"@id":"https://cms.irmin.dev/en/category/irmin-news/#breadcrumb"},"inLanguage":"en-GB"},{"@type":"BreadcrumbList","@id":"https://cms.irmin.dev/en/category/irmin-news/#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://cms.irmin.dev/en/home/"},{"@type":"ListItem","position":2,"name":"Irmin News"}]},{"@type":"WebSite","@id":"https://cms.irmin.dev/#website","url":"https://cms.irmin.dev/","name":"IRMIN","description":"Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.","publisher":{"@id":"https://cms.irmin.dev/#organization"},"potentialAction":[{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://cms.irmin.dev/?s={search_term_string}"},"query-input":"required name=search_term_string"}],"inLanguage":"en-GB"},{"@type":"Organization","@id":"https://cms.irmin.dev/#organization","name":"IRMIN","url":"https://cms.irmin.dev/","logo":{"@type":"ImageObject","inLanguage":"en-GB","@id":"https://cms.irmin.dev/#/schema/logo/image/","url":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","contentUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","width":952,"height":216,"caption":"IRMIN"},"image":{"@id":"https://cms.irmin.dev/#/schema/logo/image/"}}]}</script>\n<!-- / Yoast SEO plugin. -->',
  yoast_head_json: {
    title: 'Irmin News Archives | IRMIN',
    robots: {
      index: 'noindex',
      follow: 'follow',
      'max-snippet': 'max-snippet:-1',
      'max-image-preview': 'max-image-preview:large',
      'max-video-preview': 'max-video-preview:-1',
    },
    og_locale: 'en_GB',
    og_type: 'article',
    og_title: 'Irmin News Archives | IRMIN',
    og_url: 'https://cms.irmin.dev/en/category/irmin-news/',
    og_site_name: 'IRMIN',
    og_image: [
      {
        width: 1440,
        height: 641,
        url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3.jpg',
        type: 'image/jpeg',
      },
    ],
    twitter_card: 'summary_large_image',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': 'https://cms.irmin.dev/en/category/irmin-news/',
          url: 'https://cms.irmin.dev/en/category/irmin-news/',
          name: 'Irmin News Archives | IRMIN',
          isPartOf: { '@id': 'https://cms.irmin.dev/#website' },
          breadcrumb: {
            '@id': 'https://cms.irmin.dev/en/category/irmin-news/#breadcrumb',
          },
          inLanguage: 'en-GB',
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://cms.irmin.dev/en/category/irmin-news/#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cms.irmin.dev/en/home/',
            },
            { '@type': 'ListItem', position: 2, name: 'Irmin News' },
          ],
        },
        {
          '@type': 'WebSite',
          '@id': 'https://cms.irmin.dev/#website',
          url: 'https://cms.irmin.dev/',
          name: 'IRMIN',
          description:
            'Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.',
          publisher: { '@id': 'https://cms.irmin.dev/#organization' },
          potentialAction: [
            {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://cms.irmin.dev/?s={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          ],
          inLanguage: 'en-GB',
        },
        {
          '@type': 'Organization',
          '@id': 'https://cms.irmin.dev/#organization',
          name: 'IRMIN',
          url: 'https://cms.irmin.dev/',
          logo: {
            '@type': 'ImageObject',
            inLanguage: 'en-GB',
            '@id': 'https://cms.irmin.dev/#/schema/logo/image/',
            url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            contentUrl:
              'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            width: 952,
            height: 216,
            caption: 'IRMIN',
          },
          image: { '@id': 'https://cms.irmin.dev/#/schema/logo/image/' },
        },
      ],
    },
  },
} as Post;

/**
 * Example WordPress post object
 */
export const exampleWPPost: Post = {
  id: 266,
  date: '2024-07-18T11:51:08',
  date_gmt: '2024-07-18T08:51:08',
  slug: 'irmin-2024-year-in-review',
  status: 'publish',
  type: 'post',
  link: 'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
  title: { rendered: 'Irmin 2024 year in review' },
  content: {
    rendered:
      '\n<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem sem, ornare sed sem vitae, ullamcorper pulvinar felis. Nunc ac velit at felis vestibulum blandit. Etiam massa quam, gravida ut massa at, sodales suscipit neque. Phasellus vitae orci diam. Nunc vulputate vestibulum mauris ut consectetur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi et lectus dignissim, tincidunt ligula in, pretium eros. Etiam et sagittis lectus. Aliquam efficitur neque vel risus pellentesque luctus in suscipit magna. Aenean dictum blandit sapien quis finibus. Quisque condimentum diam eu massa vulputate semper. Donec posuere sagittis elit at hendrerit. Etiam quis nisl sit amet leo dignissim aliquet. Praesent urna justo, tempus ac interdum ut, convallis sed enim. Donec sodales, nunc eu lacinia ullamcorper, nulla erat eleifend turpis, quis interdum lorem purus id dolor. Cras sed nulla vel leo fermentum accumsan ac at felis.</p>\n\n\n\n<figure class="wp-block-image size-large"><img loading="lazy" decoding="async" width="1024" height="456" src="http://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3-1024x456.jpg" alt="" class="wp-image-247" srcset="https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3-1024x456.jpg 1024w, https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3-300x134.jpg 300w, https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3-768x342.jpg 768w, https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3.jpg 1440w" sizes="(max-width: 1024px) 100vw, 1024px" /></figure>\n\n\n\n<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem sem, ornare sed sem vitae, ullamcorper pulvinar felis. Nunc ac velit at felis vestibulum blandit. Etiam massa quam, gravida ut massa at, sodales suscipit neque. Phasellus vitae orci diam. Nunc vulputate vestibulum mauris ut consectetur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi et lectus dignissim, tincidunt ligula in, pretium eros. Etiam et sagittis lectus. Aliquam efficitur neque vel risus pellentesque luctus in suscipit magna. Aenean dictum blandit sapien quis finibus. Quisque condimentum diam eu massa vulputate semper. Donec posuere sagittis elit at hendrerit. Etiam quis nisl sit amet leo dignissim aliquet. Praesent urna justo, tempus ac interdum ut, convallis sed enim. Donec sodales, nunc eu lacinia ullamcorper, nulla erat eleifend turpis, quis interdum lorem purus id dolor. Cras sed nulla vel leo fermentum accumsan ac at felis.</p>\n',
    protected: false,
  },
  excerpt: {
    rendered:
      '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem sem, ornare sed sem vitae, ullamcorper pulvinar felis. Nunc ac velit at felis vestibulum blandit. Etiam massa quam, gravida ut massa at, sodales suscipit neque. Phasellus vitae orci diam. Nunc vulputate vestibulum mauris ut consectetur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames [&hellip;]</p>\n',
    protected: false,
  },
  featured_media: 151,
  categories: [19],
  tags: [],
  yoast_head:
    '<!-- This site is optimized with the Yoast SEO plugin v23.0 - https://yoast.com/wordpress/plugins/seo/ -->\n<title>Irmin 2024 year in review | IRMIN</title>\n<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />\n<meta property="og:locale" content="en_GB" />\n<meta property="og:type" content="article" />\n<meta property="og:title" content="Irmin 2024 year in review | IRMIN" />\n<meta property="og:description" content="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem sem, ornare sed sem vitae, ullamcorper pulvinar felis. Nunc ac velit at felis vestibulum blandit. Etiam massa quam, gravida ut massa at, sodales suscipit neque. Phasellus vitae orci diam. Nunc vulputate vestibulum mauris ut consectetur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames [&hellip;]" />\n<meta property="og:url" content="https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/" />\n<meta property="og:site_name" content="IRMIN" />\n<meta property="article:published_time" content="2024-07-18T08:51:08+00:00" />\n<meta property="article:modified_time" content="2024-07-18T08:51:18+00:00" />\n<meta property="og:image" content="http://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg" />\n\t<meta property="og:image:width" content="640" />\n\t<meta property="og:image:height" content="438" />\n\t<meta property="og:image:type" content="image/jpeg" />\n<meta name="author" content="Tim Borovkov" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:label1" content="Written by" />\n\t<meta name="twitter:data1" content="Tim Borovkov" />\n\t<meta name="twitter:label2" content="Estimated reading time" />\n\t<meta name="twitter:data2" content="2 minutes" />\n<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[{"@type":"Article","@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#article","isPartOf":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/"},"author":{"name":"Tim Borovkov","@id":"https://cms.irmin.dev/#/schema/person/aeae0539cbcb6c991a4091b0969e21c3"},"headline":"Irmin 2024 year in review","datePublished":"2024-07-18T08:51:08+00:00","dateModified":"2024-07-18T08:51:18+00:00","mainEntityOfPage":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/"},"wordCount":292,"commentCount":0,"publisher":{"@id":"https://cms.irmin.dev/#organization"},"image":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage"},"thumbnailUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg","articleSection":["Irmin News"],"inLanguage":"en-GB","potentialAction":[{"@type":"CommentAction","name":"Comment","target":["https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#respond"]}]},{"@type":"WebPage","@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/","url":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/","name":"Irmin 2024 year in review | IRMIN","isPartOf":{"@id":"https://cms.irmin.dev/#website"},"primaryImageOfPage":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage"},"image":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage"},"thumbnailUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg","datePublished":"2024-07-18T08:51:08+00:00","dateModified":"2024-07-18T08:51:18+00:00","breadcrumb":{"@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#breadcrumb"},"inLanguage":"en-GB","potentialAction":[{"@type":"ReadAction","target":["https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/"]}]},{"@type":"ImageObject","inLanguage":"en-GB","@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage","url":"https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg","contentUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg","width":640,"height":438},{"@type":"BreadcrumbList","@id":"https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://cms.irmin.dev/en/home/"},{"@type":"ListItem","position":2,"name":"Irmin 2024 year in review"}]},{"@type":"WebSite","@id":"https://cms.irmin.dev/#website","url":"https://cms.irmin.dev/","name":"IRMIN","description":"Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.","publisher":{"@id":"https://cms.irmin.dev/#organization"},"potentialAction":[{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://cms.irmin.dev/?s={search_term_string}"},"query-input":"required name=search_term_string"}],"inLanguage":"en-GB"},{"@type":"Organization","@id":"https://cms.irmin.dev/#organization","name":"IRMIN","url":"https://cms.irmin.dev/","logo":{"@type":"ImageObject","inLanguage":"en-GB","@id":"https://cms.irmin.dev/#/schema/logo/image/","url":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","contentUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","width":952,"height":216,"caption":"IRMIN"},"image":{"@id":"https://cms.irmin.dev/#/schema/logo/image/"}},{"@type":"Person","@id":"https://cms.irmin.dev/#/schema/person/aeae0539cbcb6c991a4091b0969e21c3","name":"Tim Borovkov","image":{"@type":"ImageObject","inLanguage":"en-GB","@id":"https://cms.irmin.dev/#/schema/person/image/","url":"https://secure.gravatar.com/avatar/882ee92809271f616f989d40613a47ab?s=96&d=mm&r=g","contentUrl":"https://secure.gravatar.com/avatar/882ee92809271f616f989d40613a47ab?s=96&d=mm&r=g","caption":"Tim Borovkov"},"sameAs":["http://cms.irmin.dev"],"url":"https://cms.irmin.dev/author/tim/"}]}</script>\n<!-- / Yoast SEO plugin. -->',
  yoast_head_json: {
    title: 'Irmin 2024 year in review | IRMIN',
    robots: {
      index: 'noindex',
      follow: 'follow',
      'max-snippet': 'max-snippet:-1',
      'max-image-preview': 'max-image-preview:large',
      'max-video-preview': 'max-video-preview:-1',
    },
    og_locale: 'en_GB',
    og_type: 'article',
    og_title: 'Irmin 2024 year in review | IRMIN',
    og_description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem sem, ornare sed sem vitae, ullamcorper pulvinar felis. Nunc ac velit at felis vestibulum blandit. Etiam massa quam, gravida ut massa at, sodales suscipit neque. Phasellus vitae orci diam. Nunc vulputate vestibulum mauris ut consectetur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames [&hellip;]',
    og_url: 'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
    og_site_name: 'IRMIN',
    article_modified_time: '2024-07-18T08:51:18+00:00',
    og_image: [
      {
        width: 640,
        height: 438,
        url: 'http://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
        type: 'image/jpeg',
      },
    ],
    author: 'Tim Borovkov',
    twitter_card: 'summary_large_image',
    twitter_misc: {
      'Written by': 'Tim Borovkov',
      'Estimated reading time': '2 minutes',
    },
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          '@id':
            'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#article',
          isPartOf: {
            '@id':
              'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
          },
          author: {
            name: 'Tim Borovkov',
            '@id':
              'https://cms.irmin.dev/#/schema/person/aeae0539cbcb6c991a4091b0969e21c3',
          },
          headline: 'Irmin 2024 year in review',
          datePublished: '2024-07-18T08:51:08+00:00',
          dateModified: '2024-07-18T08:51:18+00:00',
          wordCount: 292,
          image: {
            '@id':
              'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage',
          },
          thumbnailUrl:
            'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
          articleSection: ['Irmin News'],
          inLanguage: 'en-GB',
        },
        {
          '@type': 'WebPage',
          '@id':
            'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
          url: 'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
          name: 'Irmin 2024 year in review | IRMIN',
          isPartOf: { '@id': 'https://cms.irmin.dev/#website' },
          primaryImageOfPage: {
            '@id':
              'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage',
          },
          image: {
            '@id':
              'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage',
          },
          thumbnailUrl:
            'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
          datePublished: '2024-07-18T08:51:08+00:00',
          dateModified: '2024-07-18T08:51:18+00:00',
          breadcrumb: {
            '@id':
              'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#breadcrumb',
          },
          inLanguage: 'en-GB',
          potentialAction: [
            {
              '@type': 'ReadAction',
              target: [
                'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/',
              ],
            },
          ],
        },
        {
          '@type': 'ImageObject',
          inLanguage: 'en-GB',
          '@id':
            'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#primaryimage',
          url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
          contentUrl:
            'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
          width: 640,
          height: 438,
        },
        {
          '@type': 'BreadcrumbList',
          '@id':
            'https://cms.irmin.dev/en/2024/07/18/irmin-2024-year-in-review/#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cms.irmin.dev/en/home/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Irmin 2024 year in review',
            },
          ],
        },
        {
          '@type': 'WebSite',
          '@id': 'https://cms.irmin.dev/#website',
          url: 'https://cms.irmin.dev/',
          name: 'IRMIN',
          description:
            'Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.',
          potentialAction: [
            {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://cms.irmin.dev/?s={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          ],
          inLanguage: 'en-GB',
        },
        {
          '@type': 'Organization',
          '@id': 'https://cms.irmin.dev/#organization',
          name: 'IRMIN',
          url: 'https://cms.irmin.dev/',
          logo: {
            '@type': 'ImageObject',
            inLanguage: 'en-GB',
            '@id': 'https://cms.irmin.dev/#/schema/logo/image/',
            url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            contentUrl:
              'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            width: 952,
            height: 216,
            caption: 'IRMIN',
          },
          image: { '@id': 'https://cms.irmin.dev/#/schema/logo/image/' },
        },
        {
          '@type': 'Person',
          '@id':
            'https://cms.irmin.dev/#/schema/person/aeae0539cbcb6c991a4091b0969e21c3',
          name: 'Tim Borovkov',
          url: 'https://cms.irmin.dev/author/tim/',
        },
      ],
    },
  },
};

/**
 * Example WordPress media object
 */
export const exampleWPMedia: Media = {
  id: 151,
  slug: 'cow_2',
  status: 'inherit',
  type: 'attachment',
  link: 'https://cms.irmin.dev/cow_2/',
  title: { rendered: 'cow_2' },
  alt_text: '',
  media_type: 'image',
  mime_type: 'image/jpeg',
  post: 0,
  media_details: {
    width: 640,
    height: 438,
    file: '2024/07/cow_2.jpeg',
    filesize: 89260,
    sizes: {
      medium: {
        file: 'cow_2-300x205.jpeg',
        width: 300,
        height: 205,
        filesize: 17818,
        mime_type: 'image/jpeg',
        source_url:
          'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2-300x205.jpeg',
      },
      thumbnail: {
        file: 'cow_2-150x150.jpeg',
        width: 150,
        height: 150,
        filesize: 7236,
        mime_type: 'image/jpeg',
        source_url:
          'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2-150x150.jpeg',
      },
      full: {
        file: 'cow_2.jpeg',
        width: 640,
        height: 438,
        mime_type: 'image/jpeg',
        source_url:
          'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
      },
    },
    image_meta: {
      aperture: '0',
      credit: '',
      camera: '',
      caption: '',
      created_timestamp: '0',
      copyright: '',
      focal_length: '0',
      iso: '0',
      shutter_speed: '0',
      title: '',
      orientation: '0',
    },
  },
  source_url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/cow_2.jpeg',
};

/**
 * Example WordPress footer object
 */
export const exampleWPFooter: Menu = [
  { ID: 204, title: 'Irmin', url: '', menu_order: 1, menu_item_parent: '0' },
  {
    ID: 201,
    title: 'Contact us',
    url: 'https://cms.irmin.dev/en/contact-us/',
    menu_order: 2,
    menu_item_parent: '0',
  },
  { ID: 205, title: 'Legal', url: '', menu_order: 3, menu_item_parent: '0' },
  {
    ID: 202,
    title: 'Terms of Use',
    url: 'https://cms.irmin.dev/en/legal/terms-of-use/',
    menu_order: 4,
    menu_item_parent: '0',
  },
  {
    ID: 203,
    title: 'Privacy Policy',
    url: 'https://cms.irmin.dev/en/legal/privacy-policy/',
    menu_order: 5,
    menu_item_parent: '0',
  },
];

/**
 * Example WordPress main menu object
 */
export const exampleWPMenu: Menu = [
  { ID: 222, title: 'Product', url: '#', menu_order: 1, menu_item_parent: '0' },
  {
    ID: 223,
    title: 'Overview 🖥️',
    url: '#',
    menu_order: 2,
    menu_item_parent: '222',
  },
  {
    ID: 224,
    title: 'Features 🦅',
    url: '#',
    menu_order: 3,
    menu_item_parent: '222',
  },
  {
    ID: 225,
    title: 'Security 👮🏻‍♂️',
    url: '#',
    menu_order: 4,
    menu_item_parent: '222',
  },
  {
    ID: 226,
    title: 'Data Warehouse 💿',
    url: '#',
    menu_order: 5,
    menu_item_parent: '222',
  },
  {
    ID: 227,
    title: 'Marketplace',
    url: '#',
    menu_order: 6,
    menu_item_parent: '0',
  },
  {
    ID: 228,
    title: 'Connectors 📦',
    url: '#',
    menu_order: 7,
    menu_item_parent: '227',
  },
  {
    ID: 229,
    title: 'Plugins 🧩',
    url: '#',
    menu_order: 8,
    menu_item_parent: '227',
  },
  {
    ID: 230,
    title: 'Integrations 🤝',
    url: '#',
    menu_order: 9,
    menu_item_parent: '227',
  },
  {
    ID: 232,
    title: 'Developers',
    url: '#',
    menu_order: 10,
    menu_item_parent: '0',
  },
  {
    ID: 231,
    title: 'Getting Started 🧑‍💻',
    url: '#',
    menu_order: 11,
    menu_item_parent: '232',
  },
  {
    ID: 233,
    title: 'Creating connectors ♻️',
    url: '#',
    menu_order: 12,
    menu_item_parent: '232',
  },
  {
    ID: 234,
    title: 'Creating plugins 🔌',
    url: '#',
    menu_order: 13,
    menu_item_parent: '232',
  },
  {
    ID: 235,
    title: 'API Reference 📚',
    url: '#',
    menu_order: 14,
    menu_item_parent: '232',
  },
  {
    ID: 236,
    title: 'FAQ 🙋🏽‍♀️',
    url: '#',
    menu_order: 15,
    menu_item_parent: '232',
  },
  {
    ID: 237,
    title: 'Pricing',
    url: '#',
    menu_order: 16,
    menu_item_parent: '0',
  },
  { ID: 238, title: 'Irmin', url: '#', menu_order: 17, menu_item_parent: '0' },
  {
    ID: 239,
    title: 'About us 📊',
    url: '#',
    menu_order: 18,
    menu_item_parent: '238',
  },
  {
    ID: 39,
    title: 'Join our team 😎',
    url: 'https://cms.irmin.dev/en/careers/',
    menu_order: 19,
    menu_item_parent: '238',
  },
  {
    ID: 240,
    title: 'Articles ☕️',
    url: '#',
    menu_order: 20,
    menu_item_parent: '238',
  },
  {
    ID: 58,
    title: 'Contact us ✉️',
    url: 'https://cms.irmin.dev/en/contact-us/',
    menu_order: 21,
    menu_item_parent: '238',
  },
];

/**
 * Example WordPress page object
 */
export const exampleWPPage: Post = {
  id: 180,
  date: '2024-07-13T14:09:38',
  date_gmt: '2024-07-13T14:09:38',
  slug: 'home',
  status: 'publish',
  type: 'page',
  link: 'https://cms.irmin.dev/en/home/',
  title: { rendered: 'Home' },
  content: { rendered: '', protected: false },
  excerpt: { rendered: '', protected: false },
  featured_media: 0,
  acf: {
    sections: [
      {
        acf_fc_layout: 'hero',
        title_parts: [
          { title: 'Just like ', green: false },
          { title: 'GitHub ', green: true },
          { title: 'for your ', green: false },
          { title: 'Data', green: true },
        ],
        description:
          'Developer friendly, open source, extendable ETL-platform with data marketplace. Democratising data access, lighting the Dark Data and helping organisations with Data Management. ',
        buttons: [
          {
            text: 'Get Started',
            link: { title: '', url: '/sign-up', target: '' },
            variant: 'solid',
            color_scheme: 'primary',
          },
          {
            text: 'Schedule a demo',
            link: '',
            variant: 'solid',
            color_scheme: 'secondary',
          },
        ],
        video_placeholder: 151,
        video: 160,
      },
    ],
    full_width: false,
  },
  yoast_head:
    '<!-- This site is optimized with the Yoast SEO plugin v23.0 - https://yoast.com/wordpress/plugins/seo/ -->\n<title>THE FRONTPAGE TITLE | IRMIN</title>\n<meta name="description" content="Hello world" />\n<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />\n<meta property="og:locale" content="en_GB" />\n<meta property="og:type" content="article" />\n<meta property="og:title" content="THE FRONTPAGE TITLE | IRMIN" />\n<meta property="og:description" content="Hello world" />\n<meta property="og:url" content="https://cms.irmin.dev/en/home/" />\n<meta property="og:site_name" content="IRMIN" />\n<meta property="article:modified_time" content="2024-07-18T07:45:23+00:00" />\n<meta property="og:image" content="https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3.jpg" />\n\t<meta property="og:image:width" content="1440" />\n\t<meta property="og:image:height" content="641" />\n\t<meta property="og:image:type" content="image/jpeg" />\n<meta name="twitter:card" content="summary_large_image" />\n<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":"https://cms.irmin.dev/en/home/","url":"https://cms.irmin.dev/en/home/","name":"THE FRONTPAGE TITLE | IRMIN","isPartOf":{"@id":"https://cms.irmin.dev/#website"},"datePublished":"2024-07-13T14:09:38+00:00","dateModified":"2024-07-18T07:45:23+00:00","description":"Hello world","breadcrumb":{"@id":"https://cms.irmin.dev/en/home/#breadcrumb"},"inLanguage":"en-GB","potentialAction":[{"@type":"ReadAction","target":["https://cms.irmin.dev/en/home/"]}]},{"@type":"BreadcrumbList","@id":"https://cms.irmin.dev/en/home/#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://cms.irmin.dev/en/home/"},{"@type":"ListItem","position":2,"name":"Home"}]},{"@type":"WebSite","@id":"https://cms.irmin.dev/#website","url":"https://cms.irmin.dev/","name":"IRMIN","description":"Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.","publisher":{"@id":"https://cms.irmin.dev/#organization"},"potentialAction":[{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://cms.irmin.dev/?s={search_term_string}"},"query-input":"required name=search_term_string"}],"inLanguage":"en-GB"},{"@type":"Organization","@id":"https://cms.irmin.dev/#organization","name":"IRMIN","url":"https://cms.irmin.dev/","logo":{"@type":"ImageObject","inLanguage":"en-GB","@id":"https://cms.irmin.dev/#/schema/logo/image/","url":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","contentUrl":"https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png","width":952,"height":216,"caption":"IRMIN"},"image":{"@id":"https://cms.irmin.dev/#/schema/logo/image/"}}]}</script>\n<!-- / Yoast SEO plugin. -->',
  yoast_head_json: {
    title: 'THE FRONTPAGE TITLE | IRMIN',
    description: 'Hello world',
    robots: {
      index: 'noindex',
      follow: 'follow',
      'max-snippet': 'max-snippet:-1',
      'max-image-preview': 'max-image-preview:large',
      'max-video-preview': 'max-video-preview:-1',
    },
    og_locale: 'en_GB',
    og_type: 'article',
    og_title: 'THE FRONTPAGE TITLE | IRMIN',
    og_description: 'Hello world',
    og_url: 'https://cms.irmin.dev/en/home/',
    og_site_name: 'IRMIN',
    article_modified_time: '2024-07-18T07:45:23+00:00',
    og_image: [
      {
        width: 1440,
        height: 641,
        url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/content-photo3.jpg',
        type: 'image/jpeg',
      },
    ],
    twitter_card: 'summary_large_image',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://cms.irmin.dev/en/home/',
          url: 'https://cms.irmin.dev/en/home/',
          name: 'THE FRONTPAGE TITLE | IRMIN',
          isPartOf: { '@id': 'https://cms.irmin.dev/#website' },
          datePublished: '2024-07-13T14:09:38+00:00',
          dateModified: '2024-07-18T07:45:23+00:00',
          description: 'Hello world',
          breadcrumb: { '@id': 'https://cms.irmin.dev/en/home/#breadcrumb' },
          inLanguage: 'en-GB',
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://cms.irmin.dev/en/home/#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cms.irmin.dev/en/home/',
            },
            { '@type': 'ListItem', position: 2, name: 'Home' },
          ],
        },
        {
          '@type': 'WebSite',
          '@id': 'https://cms.irmin.dev/#website',
          url: 'https://cms.irmin.dev/',
          name: 'IRMIN',
          description:
            'Tired of scattered data? Sync, analyse &amp; manage your data with AI in minutes. Use connectors, marketplace &amp; run actions.',
          inLanguage: 'en-GB',
        },
        {
          '@type': 'Organization',
          '@id': 'https://cms.irmin.dev/#organization',
          name: 'IRMIN',
          url: 'https://cms.irmin.dev/',
          logo: {
            '@type': 'ImageObject',
            inLanguage: 'en-GB',
            '@id': 'https://cms.irmin.dev/#/schema/logo/image/',
            url: 'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            contentUrl:
              'https://cms.irmin.dev/wp-content/uploads/2024/07/logo.png',
            width: 952,
            height: 216,
            caption: 'IRMIN',
          },
          image: { '@id': 'https://cms.irmin.dev/#/schema/logo/image/' },
        },
      ],
    },
  },
};
