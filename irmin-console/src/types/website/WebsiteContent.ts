/**
 * Category type for articles on the website
 */
export interface WebsiteArticleCategory {
  /** Category name */
  name: string;
  /** Category slug */
  slug: string;
  /** Category ID */
  id: number;
}

/**
 * Article type for articles on the website
 */
export interface WebsiteArticle {
  /** Article title */
  title: string;
  /** Article excerpt */
  excerpt: string;
  /** Article date */
  date: string;
  /** Miscellaneous information about the article, such as author and reading time */
  misc?: {
    /** Written by */
    'Written by': string;
    /** Estimated reading time */
    'Estimated reading time': string;
  };
  /** Article slug */
  slug: string;
  /** Article URL */
  url: string;
  /** Article image */
  image: string;
  /** Article categories */
  categories: WebsiteArticleCategory[];
}
