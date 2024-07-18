import { Media, Menu, Post } from '@/types/Wordpress';

export default class WordPress {
  private static instance: WordPress;
  private baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public static getInstance(): WordPress {
    if (!WordPress.instance) {
      const baseUrl =
        process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://cms.irmin.dev';
      WordPress.instance = new WordPress(baseUrl);
    }
    return WordPress.instance;
  }

  private async fetchAPI(
    endpoint: string
  ): Promise<Post | Post[] | Media | Media[] | Menu | null> {
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/${endpoint}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return await res.json();
  }

  public async getMenu(menuSlug: string): Promise<Menu | null> {
    const menu = (await this.fetchAPI(`menus?slug=${menuSlug}`)) as Menu;
    return menu ?? null;
  }

  public async getPage(slug: string): Promise<Post | null> {
    try {
      const post = (await this.fetchAPI(`pages?slug=${slug}`)) as Post[];
      if (post && post.length > 0) {
        return post[0];
      }
    } catch (e) {
      console.error('Wordpress getPage failed: ', e);
    }
    return null;
  }

  public async getPost(slug: string): Promise<Post | null> {
    try {
      const post = (await this.fetchAPI(`posts?slug=${slug}`)) as Post[];
      if (post && post.length > 0) {
        return post[0];
      }
    } catch (e) {
      console.error('Wordpress getPost failed: ', e);
    }
    return null;
  }

  public async getPostByID(id: number): Promise<Post | null> {
    const post = (await this.fetchAPI(`posts/${id}?_embed`)) as Post;
    return post ?? null;
  }

  public async getMediaByID(id: number): Promise<Media | null> {
    const media = (await this.fetchAPI(`media/${id}`)) as Media;
    return media ?? null;
  }

  public async getCategoryByID(id: number): Promise<Post | null> {
    const taxonomy = (await this.fetchAPI(`categories/${id}`)) as Post;
    return taxonomy ?? null;
  }

  private async fetchAll<T extends Post | Media>(
    endpoint: string,
    perPage: number = 100
  ): Promise<T[] | null> {
    let page = 1;
    let results: T[] = [];
    let fetchedData: T[];

    do {
      fetchedData = (await this.fetchAPI(
        `${endpoint}?per_page=${perPage}&page=${page}`
      )) as T[];
      results = results.concat(fetchedData);
      page++;
    } while (fetchedData.length === perPage);

    return results.length > 0 ? results : null;
  }

  public async getPosts(): Promise<Post[] | null> {
    const posts = await this.fetchAll<Post>('posts');
    return posts ?? null;
  }

  public async getPages(): Promise<Post[] | null> {
    const pages = await this.fetchAll<Post>('pages');
    return pages ?? null;
  }

  public async getMedias(): Promise<Media[] | null> {
    const medias = await this.fetchAll<Media>('media');
    return medias ?? null;
  }
}
