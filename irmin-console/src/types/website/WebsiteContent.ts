export interface WebsiteArticleCategory {
  name: string;
  slug: string;
  id: number;
}
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
