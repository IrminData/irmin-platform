/**
 * Category type for articles on the website
 * @typeParam name - Category name
 * @typeParam slug - Category slug
 * @typeParam id - Category ID
 */
export interface WebsiteArticleCategory {
  name: string;
  slug: string;
  id: number;
}
/**
 * Article type for articles on the website
 * @typeParam title - Article title
 * @typeParam excerpt - Article excerpt
 * @typeParam date - Article date
 * @typeParam misc - Miscellaneous information about the article, such as author and reading time
 * @typeParam slug - Article slug
 * @typeParam url - Article URL
 * @typeParam image - Article image
 * @typeParam categories - Article categories
 */
export interface WebsiteArticle {
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
  categories: WebsiteArticleCategory[];
}
