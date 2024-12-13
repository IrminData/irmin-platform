/**
 * Post object returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  name?: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: Title;
  content: Content;
  excerpt: Excerpt;
  acf?: Acf;
  yoast_head: string;
  yoast_head_json: YoastHeadJson;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Title {
  rendered: string;
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Content {
  rendered: string;
  protected: boolean;
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Excerpt {
  rendered: string;
  protected: boolean;
}

/**
 * Custom fields object returned by the Wordpress API
 * These are fields added using the Advanced Custom Fields plugin
 * These fields are used to store additional data for the post
 *
 * See src/components/website/templates/PageSections.tsx to understand section rendering
 *
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Acf {
  /** Sections of the page. Each section is a different type of content block. */
  sections: IrminWebsiteSection[];
  /** Whether the page should be full width or not. */
  full_width: boolean;
}

/**
 * Options for the different types of sections on the website
 *
 * See src/components/website/templates/PageSections.tsx to understand section rendering
 *
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
export type IrminWebsiteSection =
  | NewsletterSection
  | TestimonialSection
  | LogoCloudSection
  | HeroSection
  | PriceSection
  | FAQSection
  | CTADarkSection
  | CTASection
  | TeamSection
  | FeaturesSection
  | ContentSection
  | ContactSection
  | CareersSection
  | NumbersSection
  | ArticlesSection;

/**
 * Type of props passed to Numbers section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/numbers.tsx`
 */
export interface NumbersSection {
  /** The type of section, in this case 'numbers' */
  acf_fc_layout: 'numbers';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The metrics displayed in the section */
  metrics: Metric[];
}

/**
 * Metric displayed in the numbers section
 */
interface Metric {
  /** The title of the metric */
  title: string;
  /** The description of the metric */
  description: string;
}

/**
 * Type of props passed to Articles section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/articles.tsx`
 */
export interface ArticlesSection {
  /** The type of section, in this case 'articles' */
  acf_fc_layout: 'articles';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
}

/**
 * Type of props passed to Careers section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/careers.tsx`
 */
export interface CareersSection {
  /** The type of section, in this case 'careers' */
  acf_fc_layout: 'careers';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The open positions displayed in the section */
  open_positions: OpenPosition[];
}

/**
 * Single open position displayed in the careers section
 *
 * @example See `src/components/website/sections/careers.tsx`
 */
interface OpenPosition {
  /** The role of the position */
  role: string;
  /** The location of the position */
  location: string;
  /** A note about the position */
  note: string;
  /** The description of the position */
  description: string;
  /** The link to the position */
  link: string | WordpressLink;
}

/**
 * Type of props passed to Contact section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/contact.tsx`
 */
export interface ContactSection {
  /** The type of section, in this case 'contact' */
  acf_fc_layout: 'contact';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The buttons displayed in the section */
  buttons: Button[];
  /** The contact methods displayed in the section */
  contact_methods: ContactMethod[];
  /** The socials displayed in the section */
  socials: Social[];
}

/**
 * Single contact method displayed in the contact section
 */
interface ContactMethod {
  /** The title of the contact method */
  title: string;
  /** The icon of the contact method */
  icon: string;
  /** The detail of the contact method */
  detail: string;
}

/**
 * Single social displayed in the contact section
 *
 * @example See `src/components/website/sections/contact.tsx`
 */
interface Social {
  /** The icon of the social */
  icon: string;
  /** The link of the social */
  link: string | WordpressLink;
}

/**
 * Type of props passed to Content section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/content.tsx`
 */
export interface ContentSection {
  /** The type of section, in this case 'content' */
  acf_fc_layout: 'content';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The features displayed in the section */
  features: Feature[];
  /** The main image of the section */
  main_image: string | number;
  /** Whether the image should be displayed first or not */
  image_first: boolean;
}

/**
 * Type of props passed to Features section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/features.tsx`
 */
export interface FeaturesSection {
  /** The type of section, in this case 'features' */
  acf_fc_layout: 'features';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The features displayed in the section */
  features: Feature[];
  /** The image of the section */
  image: string;
}

/**
 * Single feature displayed in the features and content sections
 */
interface Feature {
  /** The title of the feature */
  title: string;
  /** The description of the feature */
  description: string;
  /** The icon of the feature */
  icon: string;
}

/**
 * Type of props passed to Team section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/team.tsx`
 */
export interface TeamSection {
  /** The type of section, in this case 'team' */
  acf_fc_layout: 'team';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The buttons displayed in the section */
  buttons: Button[];
  /** The people displayed in the section */
  people: People[];
}

/**
 * Single person displayed in the team section
 *
 * @example See `src/components/website/sections/team.tsx`
 */
interface People {
  /** The name of the person */
  name: string;
  /** The title of the person */
  title: string;
  /** The description of the person */
  description: string;
  /** The profile of the person */
  profile: string | number;
}

/**
 * Type of props passed to CTA section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/cta.tsx`
 */
export interface CTASection {
  /** The type of section, in this case 'cta' */
  acf_fc_layout: string;
  /** The title of the section */
  title: string;
  /** The bullet points displayed in the section */
  bullet_points: BulletPoint[];
  /** The buttons displayed in the section */
  buttons: Button[];
  /** The image of the section */
  image: string | number;
}

/**
 * Type of props passed to CTA dark section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/cta-dark.tsx`
 */
export interface CTADarkSection {
  /** The type of section, in this case 'cta_dark' */
  acf_fc_layout: 'cta_dark';
  /** The title of the section */
  title: string;
  /** The description of the section */
  description: string;
  /** The buttons displayed in the section */
  buttons: Button[];
}

/**
 * Type of props passed to FAQ section on the website from Wordpress API
 *
 * @example See `src/components/website/websiteFAQSection.tsx`
 */
export interface FAQSection {
  /** The type of section, in this case 'faq' */
  acf_fc_layout: 'faq';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The questions displayed in the section */
  questions: Question[];
}

/**
 * Single question displayed in the FAQ section
 */
interface Question {
  /** The title of the question */
  title: string;
  /** The description of the question */
  description: string;
  /** The icon of the question */
  icon: string;
}

/**
 * Type of props passed to Price section on the website from Wordpress API
 *
 * @example See `src/components/website/websitePriceSection.tsx`
 */
export interface PriceSection {
  /** The type of section, in this case 'prices' */
  acf_fc_layout: 'prices';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
  /** The description of the section */
  description: string;
  /** The annual saving note of the section */
  annual_saving_note: string;
  /** The prices displayed in the section */
  prices: Price[];
}

/**
 * Single price displayed in the price section
 *
 * @example See `src/components/website/websitePriceSection.tsx`
 */
interface Price {
  /** The title of the price */
  title: string;
  /** The subtitle of the price */
  subtitle: string;
  /** The monthly price of the price */
  monthly_price: number;
  /** The annual price of the price */
  annual_price: number;
  /** The bullet points of the price */
  bullet_points: BulletPoint[];
  /** The link text of the price */
  link_text: string;
  /** The link of the price */
  link: string | WordpressLink;
}

/**
 * Single bullet point displayed in the price and CTA sections
 */
interface BulletPoint {
  /** The title of the bullet point */
  title: string;
}

/**
 * Type of props passed to Hero section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/hero.tsx`
 */
export interface HeroSection {
  /** The type of section, in this case 'hero' */
  acf_fc_layout: 'hero';
  /** The title parts displayed in the section */
  title_parts: TitlePart[];
  /** The description of the section */
  description: string;
  /** The buttons displayed in the section */
  buttons: Button[];
  /** The video placeholder of the section */
  video_placeholder: string | number;
  /** The video of the section */
  video: string | number;
}

/**
 * Single title part displayed in the hero section
 */
interface TitlePart {
  /** The title of the title part */
  title: string;
  /** Whether the title part should be green or not */
  green: boolean;
}

/**
 * Type of props passed to Testimonial section on the website from Wordpress API
 */
export interface TestimonialSection {
  /** The type of section, in this case 'testimonials' */
  acf_fc_layout: 'testimonials';
  /** The testimonials displayed in the section */
  testimonials: Testimonial[];
}

/**
 * Single testimonial displayed in the testimonial section
 */
interface Testimonial {
  /** The image of the testimonial */
  image: string | number;
  /** The name of the testimonial */
  name: string;
  /** The title of the testimonial */
  title: string;
  /** The quote of the testimonial */
  quote: string;
}

/**
 * Type of props passed to Logo cloud section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/logoCloud.tsx`
 */
export interface LogoCloudSection {
  /** The type of section, in this case 'logo_cloud' */
  acf_fc_layout: 'logo_cloud';
  /** The title of the section */
  title: string;
  /** The logos displayed in the section */
  logos: Logo[];
}

/**
 * Single logo displayed in the logo cloud section
 */
interface Logo {
  /** The logo of the logo */
  logo: string | number;
  /** The title of the logo */
  title: string;
}

/**
 * Type of props passed to Newsletter section on the website from Wordpress API
 *
 * @example See `src/components/website/sections/newsletter.tsx`
 */
export interface NewsletterSection {
  /** The type of section, in this case 'newsletter' */
  acf_fc_layout: 'newsletter';
  /** The title of the section */
  title: string;
  /** The subtitle of the section */
  subtitle: string;
}

/**
 * When a section gets a Button object, it can be rendered as a button
 * This is the type of the button object returned by the Wordpress API
 */
interface Button {
  /** The text of the button */
  text: string;
  /** The link of the button */
  link: string | WordpressLink;
  /** The icon of the button */
  icon?: string | null;
  /** The variant of the button */
  variant:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'accent'
    | 'secondary'
    | 'gray'
    | 'ghost'
    | 'link'
    | 'gradient';
}

/**
 * When a section gets a Link object, it can be rendered.
 * This is the type of the link object returned by the Wordpress API
 */
export interface WordpressLink {
  title: string;
  url: string;
  target: string;
}

/**
 * SEO object returned by the Wordpress API
 */
interface YoastHeadJson {
  title?: string;
  description?: string;
  author?: string;
  robots: Robots;
  og_locale?: string;
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_site_name?: string;
  article_modified_time?: string;
  og_image?: OgImage[];
  twitter_card?: string;
  twitter_misc?: {
    'Written by': string;
    'Estimated reading time': string;
  };
  schema?: Schema;
}

/**
 * Robots object returned by the Wordpress API
 * This should not be used for anything.
 */
interface Robots {
  index: string;
  follow: string;
  'max-snippet': string;
  'max-image-preview': string;
  'max-video-preview': string;
}

interface OgImage {
  url: string;
  width: number;
  height: number;
  type: string;
}

interface Schema {
  '@context': string;
  '@graph': Graph[];
}

interface Graph {
  '@type': string;
  '@id': string;
  url?: string;
  name?: string;
  isPartOf?: IsPartOf;
  primaryImageOfPage?: PrimaryImageOfPage;
  image?: Image;
  thumbnailUrl?: string;
  datePublished?: string;
  dateModified?: string;
  breadcrumb?: Breadcrumb;
  inLanguage?: string;
  contentUrl?: string;
  width?: number;
  height?: number;
  itemListElement?: ItemListElement[];
  description?: string;
  headline?: string;
  wordCount?: number;
  articleSection?: string[];
  publisher?: { '@id': string };
  logo?: {
    '@type': string;
    inLanguage: string;
    '@id': string;
    url: string;
    contentUrl: string;
    width: number;
    height: number;
    caption: string;
  };
  author?: {
    name: string;
    '@id': string;
  };
  potentialAction?: {
    '@type': string;
    target:
      | {
          '@type': string;
          urlTemplate: string;
        }
      | string[];
    'query-input'?: string;
  }[];
}

interface IsPartOf {
  '@id': string;
}

interface PrimaryImageOfPage {
  '@id': string;
}

interface Image {
  '@id': string;
}

interface Breadcrumb {
  '@id': string;
}

interface ItemListElement {
  '@type': string;
  position: number;
  name: string;
  item?: string;
}

export type Menu = MenuItem[];

export interface MenuItem {
  ID: number;
  title: string;
  url: string;
  menu_order: number;
  menu_item_parent: string;
}

export interface Media {
  id: number;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: Title;
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details?: MediaDetails;
  post: number;
  source_url: string;
}

export interface MediaDetails {
  width: number;
  height: number;
  file: string;
  filesize: number;
  sizes: Sizes;
  image_meta: ImageMeta;
}

export interface Sizes {
  medium: Medium;
  thumbnail: Thumbnail;
  full: Full;
}

export interface Medium {
  file: string;
  width: number;
  height: number;
  filesize: number;
  mime_type: string;
  source_url: string;
}

export interface Thumbnail {
  file: string;
  width: number;
  height: number;
  filesize: number;
  mime_type: string;
  source_url: string;
}

export interface Full {
  file: string;
  width: number;
  height: number;
  mime_type: string;
  source_url: string;
}

export interface ImageMeta {
  aperture: string;
  credit: string;
  camera: string;
  caption: string;
  created_timestamp: string;
  copyright: string;
  focal_length: string;
  iso: string;
  shutter_speed: string;
  title: string;
  orientation: string;
}
