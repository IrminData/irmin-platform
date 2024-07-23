export interface Post {
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

interface Title {
  rendered: string;
}

interface Content {
  rendered: string;
  protected: boolean;
}

interface Excerpt {
  rendered: string;
  protected: boolean;
}

interface Acf {
  sections: IrminWebsiteSection[];
  full_width: boolean;
}

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

export interface NumbersSection {
  acf_fc_layout: 'numbers';
  title: string;
  subtitle: string;
  description: string;
  metrics: Metric[];
}

interface Metric {
  title: string;
  description: string;
}

export interface ArticlesSection {
  acf_fc_layout: 'articles';
  title: string;
  subtitle: string;
  description: string;
}

export interface CareersSection {
  acf_fc_layout: 'careers';
  title: string;
  subtitle: string;
  description: string;
  open_positions: OpenPosition[];
}

interface OpenPosition {
  role: string;
  location: string;
  note: string;
  description: string;
  link: string | WordpressLink;
}

export interface ContactSection {
  acf_fc_layout: 'contact';
  title: string;
  subtitle: string;
  description: string;
  buttons: Button[];
  contact_methods: ContactMethod[];
  socials: Social[];
}

interface ContactMethod {
  title: string;
  icon: string;
  detail: string;
}

interface Social {
  icon: string;
  link: string | WordpressLink;
}

export interface ContentSection {
  acf_fc_layout: 'content';
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  main_image: string | number;
  image_first: boolean;
}

export interface FeaturesSection {
  acf_fc_layout: 'features';
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  image: string;
}

interface Feature {
  title: string;
  description: string;
  icon: string;
}

export interface TeamSection {
  acf_fc_layout: 'team';
  title: string;
  subtitle: string;
  description: string;
  buttons: Button[];
  people: People[];
}

interface People {
  name: string;
  title: string;
  description: string;
  profile: string | number;
}

export interface CTASection {
  acf_fc_layout: string;
  title: string;
  bullet_points: BulletPoint[];
  buttons: Button[];
  image: string | number;
}

export interface CTADarkSection {
  acf_fc_layout: 'cta_dark';
  title: string;
  description: string;
  buttons: Button[];
}

export interface FAQSection {
  acf_fc_layout: 'faq';
  title: string;
  subtitle: string;
  description: string;
  questions: Question[];
}

interface Question {
  title: string;
  description: string;
  icon: string;
}

export interface PriceSection {
  acf_fc_layout: 'prices';
  title: string;
  subtitle: string;
  description: string;
  annual_saving_note: string;
  prices: Price[];
}

interface Price {
  title: string;
  subtitle: string;
  monthly_price: number;
  annual_price: number;
  bullet_points: BulletPoint[];
  link_text: string;
  link: string | WordpressLink;
}

interface BulletPoint {
  title: string;
}

export interface HeroSection {
  acf_fc_layout: 'hero';
  title_parts: TitlePart[];
  description: string;
  buttons: Button[];
  video_placeholder: string | number;
  video: string | number;
}

interface TitlePart {
  title: string;
  green: boolean;
}

export interface TestimonialSection {
  acf_fc_layout: 'testimonials';
  testimonials: Testimonial[];
}

interface Testimonial {
  image: string | number;
  name: string;
  title: string;
  quote: string;
}

export interface LogoCloudSection {
  acf_fc_layout: 'logo_cloud';
  title: string;
  logos: Logo[];
}

interface Logo {
  logo: string | number;
  title: string;
}

export interface NewsletterSection {
  acf_fc_layout: 'newsletter';
  title: string;
  subtitle: string;
}

interface Button {
  text: string;
  link: string | WordpressLink;
  variant: 'link' | 'outline' | 'solid';
  color_scheme: 'primary' | 'secondary' | 'tertiary' | 'gray' | 'black';
}

export interface WordpressLink {
  title: string;
  url: string;
  target: string;
}

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
  media_details: MediaDetails;
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
