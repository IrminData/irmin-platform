import {
  exampleWPCategory,
  exampleWPFooter,
  exampleWPMedia,
  exampleWPMenu,
  exampleWPPage,
  exampleWPPost,
} from '@/types/examples/wordpressObjects';
import { Media, Menu, WPPost } from '@/types/website/Wordpress';

const offlineMode = process.env.NEXT_PUBLIC_CMS_OFFLINE_MODE === 'true';

/**
 * WordPress API service
 *
 * @remarks
 *
 * This service calls the WordPress API and is responsible for all CMS API calls.
 *
 * Like the other API services, this service is a singleton, meaning that only one
 * instance of the service can exist at a time.
 *
 * If the environment is set to offline mode, service will return example data instead
 * of making API calls.
 *
 * Example data can be found here: `@/types/examples/wordpressObjects`
 */
export default class WordPress {
  private static instance: WordPress;
  private baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the instance of the {@link WordPress}
   * @returns The instance of the WordPress
   */
  public static getInstance(): WordPress {
    if (!WordPress.instance) {
      const baseUrl =
        process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://cms.irmin.dev';
      WordPress.instance = new WordPress(baseUrl);
    }
    return WordPress.instance;
  }

  /**
   * Fetch data from the WordPress API
   * @param endpoint - The API endpoint to fetch data from
   * @returns The fetched data
   * @internal
   */
  private async fetchAPI(
    endpoint: string
  ): Promise<WPPost | WPPost[] | Media | Media[] | Menu | null> {
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/${endpoint}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return await res.json();
  }

  /**
   * Get a Wordpress menu by its slug
   * @param menuSlug - The slug of the menu to get
   * @returns The menu or null if not found
   */
  public async getMenu(menuSlug: string): Promise<Menu | null> {
    if (offlineMode)
      return menuSlug.includes('footer') ? exampleWPFooter : exampleWPMenu;
    try {
      const menu = (await this.fetchAPI(`menus?slug=${menuSlug}`)) as Menu;
      return menu ?? null;
    } catch (e) {
      console.error('Wordpress getMenu failed: ', e);
    }
    return null;
  }

  /**
   * Get a Wordpress page by its slug
   * @param slug - The slug of the page to get
   * @returns The page or null if not found
   */
  public async getPage(slug: string): Promise<WPPost | null> {
    if (offlineMode) return exampleWPPage;
    try {
      const post = (await this.fetchAPI(`pages?slug=${slug}`)) as WPPost[];
      if (post && post.length > 0) {
        return post[0];
      }
    } catch (e) {
      console.error('Wordpress getPage failed: ', e);
    }
    return null;
  }

  /**
   * Get a Wordpress post by its slug
   * @param slug - The slug of the post to get
   * @returns The post or null if not found
   */
  public async getPost(slug: string): Promise<WPPost | null> {
    if (offlineMode) return exampleWPPost;
    try {
      const post = (await this.fetchAPI(`posts?slug=${slug}`)) as WPPost[];
      if (post && post.length > 0) {
        return post[0];
      }
    } catch (e) {
      console.error('Wordpress getPost failed: ', e);
    }
    return null;
  }

  /**
   * Get a Wordpress post by its ID
   * @param id - The ID of the post to get
   * @returns The post or null if not found
   */
  public async getPostByID(id: number): Promise<WPPost | null> {
    if (offlineMode) return exampleWPPost;
    try {
      const post = (await this.fetchAPI(`posts/${id}?_embed`)) as WPPost;
      return post ?? null;
    } catch (e) {
      console.error('Wordpress getPostByID failed: ', e);
    }
    return null;
  }

  /**
   * Get a Wordpress media by its ID
   * @param id - The ID of the media to get
   * @returns The media or null if not found
   */
  public async getMediaByID(id: number): Promise<Media | null> {
    if (offlineMode) return exampleWPMedia;
    try {
      const media = (await this.fetchAPI(`media/${id}`)) as Media;
      return media ?? null;
    } catch (e) {
      console.error('Wordpress getMediaByID failed: ', e);
    }
    return null;
  }

  /**
   * Get a Wordpress category by its ID
   * @param id - The ID of the category to get
   * @returns The category or null if not found
   */
  public async getCategoryByID(id: number): Promise<WPPost | null> {
    if (offlineMode) return exampleWPCategory;
    try {
      const taxonomy = (await this.fetchAPI(`categories/${id}`)) as WPPost;
      return taxonomy ?? null;
    } catch (e) {
      console.error('Wordpress getCategoryByID failed: ', e);
    }
    return null;
  }

  /**
   * Fetch all data from a given endpoint
   * @param endpoint - The API endpoint to fetch data from
   * @param perPage - The number of items to fetch per page
   * @returns The fetched data
   * @internal
   */
  private async fetchAll<T extends WPPost | Media>(
    endpoint: string,
    perPage: number = 100
  ): Promise<T[] | null> {
    if (offlineMode) {
      switch (endpoint) {
        case 'posts':
          return [exampleWPPost] as T[];
        case 'pages':
          return [exampleWPPage] as T[];
        case 'media':
          return [exampleWPMedia] as T[];
        default:
          return [];
      }
    }
    try {
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
    } catch (e) {
      console.error('Wordpress fetchAll failed: ', e);
    }
    return [];
  }

  /**
   * Get all posts from the WordPress API
   * @returns The posts array or null if not found
   */
  public async getPosts(): Promise<WPPost[] | null> {
    const posts = await this.fetchAll<WPPost>('posts');
    return posts ?? null;
  }

  /**
   * Get all pages from the WordPress API
   * @returns The pages array or null if not found
   */
  public async getPages(): Promise<WPPost[] | null> {
    const pages = await this.fetchAll<WPPost>('pages');
    return pages ?? null;
  }

  /**
   * Get all media from the WordPress API
   * @returns The media array or null if not found
   */
  public async getMedias(): Promise<Media[] | null> {
    const medias = await this.fetchAll<Media>('media');
    return medias ?? null;
  }
}
